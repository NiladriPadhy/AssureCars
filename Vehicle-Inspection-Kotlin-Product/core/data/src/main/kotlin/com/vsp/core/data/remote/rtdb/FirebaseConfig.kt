package com.vsp.core.data.remote.rtdb

/**
 * Per-vendor Firebase configuration, injected from the app module's BuildConfig (backed by
 * local.properties). No `google-services.json` is required: a dedicated [com.google.firebase.FirebaseApp]
 * is initialized from these values so each vendor build targets its own Realtime Database.
 *
 * When [databaseUrl] is blank the app runs in offline baseline mode (RTDB disabled, graceful).
 */
data class FirebaseConfig(
    val databaseUrl: String = "",
    val projectId: String = "",
    val applicationId: String = "",
    val apiKey: String = "",
) {
    val isConfigured: Boolean
        get() = databaseUrl.isNotBlank() && applicationId.isNotBlank() && apiKey.isNotBlank()

    companion object {
        // Values come from local.properties/BuildConfig where a stray space (e.g. `KEY= https://…`)
        // is easy to introduce; the Firebase SDK rejects a URL with surrounding whitespace. Trim.
        fun of(databaseUrl: String, projectId: String, applicationId: String, apiKey: String) =
            FirebaseConfig(databaseUrl.trim(), projectId.trim(), applicationId.trim(), apiKey.trim())
    }
}
