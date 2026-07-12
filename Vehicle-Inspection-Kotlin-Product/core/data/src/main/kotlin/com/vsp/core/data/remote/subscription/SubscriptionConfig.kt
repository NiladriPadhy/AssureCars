package com.vsp.core.data.remote.subscription

/**
 * Configuration for the subscription Cloud Functions API. [baseUrl] is the deployed functions base
 * (e.g. https://us-central1-vehicletracking-f24d9.cloudfunctions.net), sourced from the app's
 * BuildConfig / local.properties. When blank, the app treats everyone as Free (offline default).
 */
data class SubscriptionConfig(
    val baseUrl: String,
    /**
     * Admin secret (`x-api-key`) for the protected create/update/delete endpoints. Only set in the
     * Admin app build; blank in the inspection app (which only calls the open `getSubscription`).
     */
    val adminApiKey: String = "",
) {
    val isConfigured: Boolean get() = baseUrl.isNotBlank()

    /** True when admin (create/update/delete) calls are possible. */
    val canAdminister: Boolean get() = isConfigured && adminApiKey.isNotBlank()
}
