package com.vsp.core.data.remote.subscription

import android.util.Log
import com.vsp.core.model.subscription.Subscription
import com.vsp.core.model.subscription.SubscriptionTier
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import javax.inject.Inject

/**
 * Thin REST client for the organisation-scoped subscription Cloud Functions API. The inspection app
 * calls the open `getSubscription` endpoint (keyed by orgId); the Admin app additionally calls the
 * protected `updateSubscription`/`deleteSubscription`. Returns the *raw* server record (tier + expiry
 * + org name); the effective tier is computed locally so expiry downgrades even offline.
 */
class SubscriptionApi @Inject constructor(
    private val config: SubscriptionConfig,
) {
    /** Fetches the subscription for organisation [orgId]; null when unconfigured or on any failure. */
    suspend fun getSubscription(orgId: String): Subscription? = withContext(Dispatchers.IO) {
        if (!config.isConfigured || orgId.isBlank()) {
            Log.w(TAG, "getSubscription: skipped (configured=${config.isConfigured}, orgId='${orgId}')")
            return@withContext null
        }
        val encoded = URLEncoder.encode(orgId.trim(), "UTF-8")
        val endpoint = "${config.baseUrl.trimEnd('/')}/getSubscription?orgId=$encoded"
        Log.i(TAG, "getSubscription: GET $endpoint")
        val connection = runCatching {
            (URL(endpoint).openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 15_000
                readTimeout = 20_000
                setRequestProperty("Accept", "application/json")
            }
        }.getOrElse {
            Log.w(TAG, "getSubscription: bad URL/connection: ${it.message}")
            return@withContext null
        }
        try {
            val code = connection.responseCode
            if (code !in 200..299) {
                val err = connection.errorStream?.bufferedReader()?.use { it.readText() }.orEmpty()
                Log.w(TAG, "getSubscription HTTP $code: ${err.take(200)}")
                return@withContext null
            }
            val body = connection.inputStream.bufferedReader().use { it.readText() }
            Log.i(TAG, "getSubscription HTTP $code body=${body.take(500)}")
            parse(body, orgId)
        } catch (e: Exception) {
            Log.w(TAG, "getSubscription failed: ${e.message}")
            null
        } finally {
            connection.disconnect()
        }
    }

    /**
     * Admin: upserts the subscription for organisation [orgId] via the protected `updateSubscription`
     * endpoint. [type] is "FREE" or "PRO"; [expiryDate] is epoch millis (null = Lifetime/not-applicable).
     */
    suspend fun updateSubscription(orgId: String, type: String, expiryDate: Long?): Subscription? =
        withContext(Dispatchers.IO) {
            if (!config.canAdminister || orgId.isBlank()) return@withContext null
            val endpoint = "${config.baseUrl.trimEnd('/')}/updateSubscription"
            val payload = JSONObject().apply {
                put("orgId", orgId.trim())
                put("type", type)
                if (expiryDate != null) put("expiryDate", expiryDate) else put("expiryDate", JSONObject.NULL)
            }.toString()
            val connection = openAdminConnection(endpoint, "PUT") ?: return@withContext null
            try {
                connection.doOutput = true
                connection.outputStream.use { it.write(payload.toByteArray(Charsets.UTF_8)) }
                val code = connection.responseCode
                if (code !in 200..299) {
                    val err = connection.errorStream?.bufferedReader()?.use { it.readText() }.orEmpty()
                    Log.w(TAG, "updateSubscription HTTP $code: ${err.take(200)}")
                    return@withContext null
                }
                val body = connection.inputStream.bufferedReader().use { it.readText() }
                parse(body, orgId)
            } catch (e: Exception) {
                Log.w(TAG, "updateSubscription failed: ${e.message}")
                null
            } finally {
                connection.disconnect()
            }
        }

    /** Admin: deletes the subscription for organisation [orgId] via the protected endpoint. */
    suspend fun deleteSubscription(orgId: String): Boolean = withContext(Dispatchers.IO) {
        if (!config.canAdminister || orgId.isBlank()) return@withContext false
        val encoded = URLEncoder.encode(orgId.trim(), "UTF-8")
        val endpoint = "${config.baseUrl.trimEnd('/')}/deleteSubscription?orgId=$encoded"
        val connection = openAdminConnection(endpoint, "DELETE") ?: return@withContext false
        try {
            val code = connection.responseCode
            if (code !in 200..299) {
                val err = connection.errorStream?.bufferedReader()?.use { it.readText() }.orEmpty()
                Log.w(TAG, "deleteSubscription HTTP $code: ${err.take(200)}")
                return@withContext false
            }
            connection.inputStream.bufferedReader().use { it.readText() }
            true
        } catch (e: Exception) {
            Log.w(TAG, "deleteSubscription failed: ${e.message}")
            false
        } finally {
            connection.disconnect()
        }
    }

    private fun openAdminConnection(endpoint: String, method: String): HttpURLConnection? = runCatching {
        (URL(endpoint).openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 15_000
            readTimeout = 20_000
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("x-api-key", config.adminApiKey)
        }
    }.getOrElse {
        Log.w(TAG, "admin connection failed for $endpoint: ${it.message}")
        null
    }

    private fun parse(body: String, fallbackOrgId: String): Subscription? = runCatching {
        val obj = JSONObject(body)
        val type = obj.optString("type", "FREE")
        val tier = if (type.equals("PRO", ignoreCase = true)) SubscriptionTier.PRO else SubscriptionTier.FREE
        val expiry = if (obj.isNull("expiryDate") || !obj.has("expiryDate")) {
            null
        } else {
            obj.optLong("expiryDate").takeIf { it > 0L }
        }
        Subscription(
            orgId = obj.optString("orgId", fallbackOrgId),
            orgName = obj.optString("orgName", ""),
            tier = tier,
            expiryDateMillis = expiry,
            lastCheckedAtMillis = System.currentTimeMillis(),
        )
    }.getOrNull()

    private companion object {
        const val TAG = "SubscriptionApi"
    }
}
