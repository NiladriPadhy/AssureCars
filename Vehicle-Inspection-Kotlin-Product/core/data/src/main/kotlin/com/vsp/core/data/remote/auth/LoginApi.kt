package com.vsp.core.data.remote.auth

import android.util.Log
import com.vsp.core.data.remote.subscription.SubscriptionConfig
import com.vsp.core.model.AppError
import com.vsp.core.model.AppResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import javax.inject.Inject

/** The authenticated profile returned by the `login` Cloud Function. */
data class RemoteSession(
    val uid: String,
    val displayName: String,
    val email: String,
    val orgId: String,
    val orgName: String,
)

/**
 * REST client for the open `login` Cloud Function. Verifies credentials server-side and returns the
 * user's profile + organisation. Distinguishes invalid credentials (401 → [AppError.Auth]) from
 * connectivity/config problems ([AppError.Network]) so the UI can message appropriately.
 */
class LoginApi @Inject constructor(
    private val config: SubscriptionConfig,
) {
    suspend fun login(email: String, password: String): AppResult<RemoteSession> = withContext(Dispatchers.IO) {
        if (!config.isConfigured) {
            return@withContext AppResult.Failure(AppError.Network(retryable = false))
        }
        val endpoint = "${config.baseUrl.trimEnd('/')}/login"
        Log.i(TAG, "login: POST $endpoint email=${email.trim()}")
        val payload = JSONObject().apply {
            put("email", email.trim())
            put("password", password)
        }.toString()
        val connection = runCatching {
            (URL(endpoint).openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 15_000
                readTimeout = 20_000
                doOutput = true
                setRequestProperty("Accept", "application/json")
                setRequestProperty("Content-Type", "application/json")
            }
        }.getOrElse {
            Log.w(TAG, "login: bad URL/connection: ${it.message}")
            return@withContext AppResult.Failure(AppError.Network())
        }
        try {
            connection.outputStream.use { it.write(payload.toByteArray(Charsets.UTF_8)) }
            val code = connection.responseCode
            when {
                code in 200..299 -> {
                    val body = connection.inputStream.bufferedReader().use { it.readText() }
                    Log.i(TAG, "login HTTP $code body=${body.take(500)}")
                    parse(body)?.let { AppResult.Success(it) }
                        ?: AppResult.Failure(AppError.Network())
                }
                code == 400 || code == 401 -> AppResult.Failure(AppError.Auth())
                else -> {
                    val err = connection.errorStream?.bufferedReader()?.use { it.readText() }.orEmpty()
                    Log.w(TAG, "login HTTP $code: ${err.take(200)}")
                    AppResult.Failure(AppError.Network(retryable = true))
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "login failed: ${e.message}")
            AppResult.Failure(AppError.Network(retryable = true))
        } finally {
            connection.disconnect()
        }
    }

    private fun parse(body: String): RemoteSession? = runCatching {
        val obj = JSONObject(body)
        val uid = obj.optString("uid", "")
        if (uid.isBlank()) return@runCatching null
        RemoteSession(
            uid = uid,
            displayName = obj.optString("displayName", ""),
            email = obj.optString("email", ""),
            orgId = obj.optString("orgId", ""),
            orgName = obj.optString("orgName", ""),
        )
    }.getOrNull()

    private companion object {
        const val TAG = "LoginApi"
    }
}
