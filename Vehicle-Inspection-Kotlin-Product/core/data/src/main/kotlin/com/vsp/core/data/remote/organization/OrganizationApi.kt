package com.vsp.core.data.remote.organization

import android.util.Log
import com.vsp.core.data.remote.subscription.SubscriptionConfig
import com.vsp.core.model.AppError
import com.vsp.core.model.AppResult
import com.vsp.core.model.organization.OrgUser
import com.vsp.core.model.organization.Organization
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import javax.inject.Inject

/**
 * REST client for the protected organisation + user management Cloud Functions (Admin app only).
 * Every call requires [SubscriptionConfig.adminApiKey] as the `x-api-key` header.
 */
class OrganizationApi @Inject constructor(
    private val config: SubscriptionConfig,
) {
    suspend fun listOrganisations(): AppResult<List<Organization>> = request(
        method = "GET",
        path = "/listOrganisations",
    ) { obj ->
        val arr = obj.optJSONArray("organisations") ?: JSONArray()
        (0 until arr.length()).map { i ->
            val o = arr.getJSONObject(i)
            Organization(id = o.optString("id"), name = o.optString("name"))
        }
    }

    suspend fun createOrganisation(name: String): AppResult<Organization> = request(
        method = "POST",
        path = "/createOrganisation",
        body = JSONObject().put("name", name.trim()),
    ) { o -> Organization(id = o.optString("id"), name = o.optString("name")) }

    suspend fun updateOrganisation(id: String, name: String): AppResult<Organization> = request(
        method = "PUT",
        path = "/updateOrganisation",
        body = JSONObject().put("id", id).put("name", name.trim()),
    ) { o -> Organization(id = o.optString("id"), name = o.optString("name")) }

    suspend fun deleteOrganisation(id: String): AppResult<Unit> = request(
        method = "DELETE",
        path = "/deleteOrganisation?id=${enc(id)}",
    ) { }

    suspend fun listUsers(orgId: String): AppResult<List<OrgUser>> = request(
        method = "GET",
        path = "/listUsers?orgId=${enc(orgId)}",
    ) { obj ->
        val arr = obj.optJSONArray("users") ?: JSONArray()
        (0 until arr.length()).map { i ->
            val o = arr.getJSONObject(i)
            OrgUser(uid = o.optString("uid"), displayName = o.optString("displayName"), email = o.optString("email"))
        }
    }

    suspend fun createUser(orgId: String, displayName: String, email: String, password: String): AppResult<OrgUser> =
        request(
            method = "POST",
            path = "/createUser",
            body = JSONObject()
                .put("orgId", orgId)
                .put("displayName", displayName.trim())
                .put("email", email.trim())
                .put("password", password),
        ) { o ->
            OrgUser(uid = o.optString("uid"), displayName = o.optString("displayName"), email = o.optString("email"))
        }

    suspend fun deleteUser(uid: String): AppResult<Unit> = request(
        method = "DELETE",
        path = "/deleteUser?uid=${enc(uid)}",
    ) { }

    /**
     * Executes a protected request and maps the JSON response with [map]. Centralises auth, method,
     * timeouts, body writing, and HTTP→[AppError] mapping.
     */
    private suspend fun <T> request(
        method: String,
        path: String,
        body: JSONObject? = null,
        map: (JSONObject) -> T,
    ): AppResult<T> = withContext(Dispatchers.IO) {
        if (!config.canAdminister) {
            return@withContext AppResult.Failure(AppError.Network(retryable = false))
        }
        val endpoint = "${config.baseUrl.trimEnd('/')}$path"
        val connection = runCatching {
            (URL(endpoint).openConnection() as HttpURLConnection).apply {
                requestMethod = method
                connectTimeout = 15_000
                readTimeout = 20_000
                setRequestProperty("Accept", "application/json")
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("x-api-key", config.adminApiKey)
                if (body != null) doOutput = true
            }
        }.getOrElse {
            Log.w(TAG, "$method $path: bad connection: ${it.message}")
            return@withContext AppResult.Failure(AppError.Network())
        }
        try {
            if (body != null) {
                connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            }
            val code = connection.responseCode
            if (code in 200..299) {
                val text = connection.inputStream.bufferedReader().use { it.readText() }
                val obj = if (text.isBlank()) JSONObject() else JSONObject(text)
                AppResult.Success(map(obj))
            } else {
                val errText = connection.errorStream?.bufferedReader()?.use { it.readText() }.orEmpty()
                Log.w(TAG, "$method $path HTTP $code: ${errText.take(200)}")
                val message = runCatching { JSONObject(errText).optString("error") }.getOrNull().orEmpty()
                when (code) {
                    400, 409 -> AppResult.Failure(AppError.Validation(message.ifBlank { "Request failed" }))
                    401 -> AppResult.Failure(AppError.Auth())
                    else -> AppResult.Failure(AppError.Network(retryable = true))
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "$method $path failed: ${e.message}")
            AppResult.Failure(AppError.Network(retryable = true))
        } finally {
            connection.disconnect()
        }
    }

    private fun enc(value: String): String = URLEncoder.encode(value.trim(), "UTF-8")

    private companion object {
        const val TAG = "OrganizationApi"
    }
}
