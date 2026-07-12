package com.vsp.core.data.remote.rtdb

import android.util.Log
import com.google.firebase.database.DataSnapshot
import com.google.firebase.database.DatabaseError
import com.google.firebase.database.ValueEventListener
import com.vsp.core.model.config.ConfigGroup
import com.vsp.core.model.config.ConfigItem
import com.vsp.core.model.config.ConfigOption
import com.vsp.core.model.config.ConfigSection
import com.vsp.core.model.config.QuestionnaireConfig
import com.vsp.core.model.config.VehicleCatalog
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.tasks.await
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Reads/writes vendor configuration in Firebase RTDB.
 *
 * The questionnaire is stored as a **fully expanded tree** so an admin can browse and edit each
 * category, group, and question as an individual node in the Firebase console (rather than one
 * opaque JSON string):
 *
 * ```
 * config/questionnaire/
 *   version, hash, updatedAt              // metadata
 *   sections/{sectionId}/                 // one node per inspection category
 *     id, title, order, appliesTo
 *     groups/{groupId}/                   // one node per group
 *       id, title, order
 *       items/{itemId}/                   // one node per question
 *         id, label, responseType, appliesTo, unit?, mandatory, allowImage, maxImages, order
 *         options[]                       // only when the question has choices
 * ```
 *
 * Child collections are keyed by their stable id (not array indices) so edits are targeted and
 * ordering is driven by each element's `order` field. The vehicle catalog remains a compact JSON
 * payload. All access is best-effort and guarded so failures degrade to offline baseline mode.
 */
@Singleton
class RtdbConfigSource @Inject constructor(
    private val firebase: FirebaseInitializer,
) {
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    suspend fun fetchQuestionnaire(): QuestionnaireConfig? {
        val db = firebase.database()
        if (db == null) {
            Log.w(TAG, "fetchQuestionnaire: RTDB unavailable (offline/not configured)")
            return null
        }
        val authed = firebase.ensureAuth()
        Log.d(TAG, "fetchQuestionnaire: reading $PATH_QUESTIONNAIRE (authed=$authed)")
        return runCatching {
            val snap = db.getReference(PATH_QUESTIONNAIRE).get().await()
            when {
                !snap.exists() -> {
                    Log.i(TAG, "fetchQuestionnaire: node absent")
                    null
                }
                snap.hasChild("sections") -> parseQuestionnaire(snap)
                    ?.also { Log.i(TAG, "fetchQuestionnaire: parsed tree v${it.version} (${it.itemIds.size} items)") }
                // Legacy single-blob format: decode it and migrate the node to the expanded tree.
                snap.hasChild("json") -> snap.child("json").asString()
                    ?.let { runCatching { json.decodeFromString<QuestionnaireConfig>(it) }.getOrNull() }
                    ?.also { migrated ->
                        Log.i(TAG, "fetchQuestionnaire: migrating legacy blob v${migrated.version} to tree")
                        runCatching {
                            db.getReference(PATH_QUESTIONNAIRE).setValue(questionnaireToMap(migrated)).await()
                        }.onFailure { Log.w(TAG, "Questionnaire tree migration failed", it) }
                    }
                else -> {
                    Log.w(TAG, "fetchQuestionnaire: node exists but has neither 'sections' nor 'json'")
                    null
                }
            }
        }.onFailure { Log.w(TAG, "RTDB read failed for $PATH_QUESTIONNAIRE", it) }.getOrNull()
    }

    suspend fun seedQuestionnaire(config: QuestionnaireConfig): Boolean {
        val db = firebase.database()
        if (db == null) {
            Log.w(TAG, "seedQuestionnaire: RTDB unavailable (offline/not configured) — cannot seed")
            return false
        }
        val authed = firebase.ensureAuth()
        Log.i(TAG, "seedQuestionnaire: writing baseline v${config.version} (${config.itemIds.size} items) to $PATH_QUESTIONNAIRE (authed=$authed)")
        return runCatching {
            db.getReference(PATH_QUESTIONNAIRE).setValue(questionnaireToMap(config)).await()
            Log.i(TAG, "seedQuestionnaire: write succeeded")
            true
        }.onFailure { Log.w(TAG, "RTDB write failed for $PATH_QUESTIONNAIRE", it) }.getOrDefault(false)
    }

    /**
     * Emits the current questionnaire from Firebase and re-emits on every remote change, so edits
     * made in the console are reflected without requiring a re-login. Emits `null` when the node is
     * absent/unparseable, or when the database is unreachable/unconfigured (offline).
     */
    fun observeQuestionnaire(): Flow<QuestionnaireConfig?> {
        val db = firebase.database() ?: return flowOf(null)
        return callbackFlow {
            firebase.ensureAuth()
            val ref = db.getReference(PATH_QUESTIONNAIRE)
            val listener = object : ValueEventListener {
                override fun onDataChange(snapshot: DataSnapshot) {
                    val config = when {
                        !snapshot.exists() -> null
                        snapshot.hasChild("sections") -> parseQuestionnaire(snapshot)
                        snapshot.hasChild("json") -> snapshot.child("json").asString()
                            ?.let { runCatching { json.decodeFromString<QuestionnaireConfig>(it) }.getOrNull() }
                        else -> null
                    }
                    trySend(config)
                }

                override fun onCancelled(error: DatabaseError) {
                    Log.w(TAG, "Questionnaire listener cancelled: ${error.message}")
                    trySend(null)
                }
            }
            ref.addValueEventListener(listener)
            awaitClose { ref.removeEventListener(listener) }
        }
    }

    /**
     * Whether a questionnaire already exists in Firebase, independent of whether it parses cleanly.
     * Returns `null` when the database is unreachable (offline / read error) so callers can avoid
     * seeding the bundled baseline on a transient failure and accidentally overwriting remote data.
     */
    suspend fun questionnaireExists(): Boolean? {
        val db = firebase.database()
        if (db == null) {
            Log.w(TAG, "questionnaireExists: RTDB unavailable — returning null (won't seed on transient failure)")
            return null
        }
        val authed = firebase.ensureAuth()
        return runCatching {
            val snap = db.getReference(PATH_QUESTIONNAIRE).get().await()
            val exists = snap.exists() && (snap.hasChild("sections") || snap.hasChild("json"))
            Log.i(TAG, "questionnaireExists=$exists (authed=$authed)")
            exists
        }.onFailure { Log.w(TAG, "RTDB existence check failed for $PATH_QUESTIONNAIRE", it) }
            .getOrNull()
    }

    suspend fun fetchVehicleCatalog(): VehicleCatalog? = readConfigJson(PATH_VEHICLE_CATALOG)?.let {
        runCatching { json.decodeFromString<VehicleCatalog>(it) }
            .onFailure { e -> Log.w(TAG, "Malformed vehicle catalog", e) }
            .getOrNull()
    }

    suspend fun seedVehicleCatalog(catalog: VehicleCatalog): Boolean =
        writeConfig(PATH_VEHICLE_CATALOG, catalog.version, catalog.hash, catalog.updatedAt, json.encodeToString(catalog))

    // ---- Questionnaire tree <-> RTDB map ------------------------------------

    private fun questionnaireToMap(config: QuestionnaireConfig): Map<String, Any?> = mapOf(
        "version" to config.version,
        "hash" to config.hash,
        "updatedAt" to config.updatedAt,
        "sections" to config.sections.associate { it.id to sectionToMap(it) },
    )

    private fun sectionToMap(section: ConfigSection): Map<String, Any?> = mapOf(
        "id" to section.id,
        "title" to section.title,
        "order" to section.order,
        "appliesTo" to section.appliesTo,
        "groups" to section.groups.associate { it.id to groupToMap(it) },
    )

    private fun groupToMap(group: ConfigGroup): Map<String, Any?> = mapOf(
        "id" to group.id,
        "title" to group.title,
        "order" to group.order,
        "items" to group.items.associate { it.id to itemToMap(it) },
    )

    private fun itemToMap(item: ConfigItem): Map<String, Any?> = buildMap {
        put("id", item.id)
        put("label", item.label)
        put("responseType", item.responseType)
        put("appliesTo", item.appliesTo)
        item.unit?.let { put("unit", it) }
        put("mandatory", item.mandatory)
        put("allowImage", item.allowImage)
        put("maxImages", item.maxImages)
        put("allowVideo", item.allowVideo)
        put("maxVideos", item.maxVideos)
        put("order", item.order)
        if (item.options.isNotEmpty()) put("options", item.options.map(::optionToMap))
    }

    private fun optionToMap(option: ConfigOption): Map<String, Any?> = mapOf(
        "value" to option.value,
        "label" to option.label,
        "order" to option.order,
    )

    private fun parseQuestionnaire(snap: DataSnapshot): QuestionnaireConfig? {
        val version = snap.child("version").asInt() ?: return null
        return QuestionnaireConfig(
            version = version,
            hash = snap.child("hash").asString().orEmpty(),
            updatedAt = snap.child("updatedAt").asLong() ?: 0L,
            sections = snap.child("sections").children
                .mapNotNull(::parseSection)
                .sortedBy { it.order },
        )
    }

    private fun parseSection(snap: DataSnapshot): ConfigSection? {
        val id = snap.child("id").asString() ?: snap.key ?: return null
        return ConfigSection(
            id = id,
            title = snap.child("title").asString().orEmpty(),
            order = snap.child("order").asInt() ?: 0,
            appliesTo = snap.child("appliesTo").asString() ?: "BOTH",
            groups = snap.child("groups").children.mapNotNull(::parseGroup).sortedBy { it.order },
        )
    }

    private fun parseGroup(snap: DataSnapshot): ConfigGroup? {
        val id = snap.child("id").asString() ?: snap.key ?: return null
        return ConfigGroup(
            id = id,
            title = snap.child("title").asString().orEmpty(),
            order = snap.child("order").asInt() ?: 0,
            items = snap.child("items").children.mapNotNull(::parseItem).sortedBy { it.order },
        )
    }

    private fun parseItem(snap: DataSnapshot): ConfigItem? {
        val id = snap.child("id").asString() ?: snap.key ?: return null
        val responseType = snap.child("responseType").asString() ?: return null
        return ConfigItem(
            id = id,
            label = snap.child("label").asString().orEmpty(),
            responseType = responseType,
            appliesTo = snap.child("appliesTo").asString() ?: "BOTH",
            unit = snap.child("unit").asString(),
            mandatory = snap.child("mandatory").asBoolean() ?: false,
            allowImage = snap.child("allowImage").asBoolean() ?: false,
            maxImages = snap.child("maxImages").asInt() ?: 0,
            allowVideo = snap.child("allowVideo").asBoolean() ?: false,
            maxVideos = snap.child("maxVideos").asInt() ?: 0,
            order = snap.child("order").asInt() ?: 0,
            options = snap.child("options").children.mapNotNull(::parseOption).sortedBy { it.order },
        )
    }

    private fun parseOption(snap: DataSnapshot): ConfigOption? {
        val value = snap.child("value").asString() ?: return null
        return ConfigOption(
            value = value,
            label = snap.child("label").asString().orEmpty(),
            order = snap.child("order").asInt() ?: 0,
        )
    }

    private fun DataSnapshot.asString(): String? = getValue(String::class.java)
    private fun DataSnapshot.asLong(): Long? = getValue(Long::class.java)
    private fun DataSnapshot.asInt(): Int? = getValue(Long::class.java)?.toInt()
    private fun DataSnapshot.asBoolean(): Boolean? = getValue(Boolean::class.java)

    // ---- Vehicle catalog (compact JSON payload) -----------------------------

    private suspend fun readConfigJson(path: String): String? {
        val db = firebase.database() ?: return null
        firebase.ensureAuth()
        return runCatching { db.getReference(path).child("json").get().await().getValue(String::class.java) }
            .onFailure { Log.w(TAG, "RTDB read failed for $path", it) }
            .getOrNull()
    }

    private suspend fun writeConfig(path: String, version: Int, hash: String, updatedAt: Long, payload: String): Boolean {
        val db = firebase.database() ?: return false
        firebase.ensureAuth()
        val value = mapOf("version" to version, "hash" to hash, "updatedAt" to updatedAt, "json" to payload)
        return runCatching { db.getReference(path).setValue(value).await(); true }
            .onFailure { Log.w(TAG, "RTDB write failed for $path", it) }
            .getOrDefault(false)
    }

    companion object {
        private const val TAG = "RtdbConfigSource"
        private const val PATH_QUESTIONNAIRE = "config/questionnaire"
        private const val PATH_VEHICLE_CATALOG = "config/vehicleCatalog"
    }
}
