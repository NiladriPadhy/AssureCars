package com.vsp.core.data.config

import android.util.Log
import com.vsp.core.data.local.dao.ConfigCacheDao
import com.vsp.core.data.local.entity.ConfigCacheEntity
import com.vsp.core.data.remote.rtdb.RtdbConfigSource
import com.vsp.core.domain.coroutine.DispatcherProvider
import com.vsp.core.domain.repository.ConfigRepository
import com.vsp.core.model.AppResult
import com.vsp.core.model.config.ConfigHashing
import com.vsp.core.model.config.QuestionnaireConfig
import com.vsp.core.model.config.VehicleCatalog
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Owns vendor configuration with a **cache-first, Firebase-backed** model (feature 002 §9–§11).
 *
 * Source-of-truth flow: Firebase RTDB → local `config_cache` (Room) → UI. The bundled
 * `baseline_questionnaire.json` is used **only to seed Firebase** when the remote node is
 * definitively absent; it is never rendered directly. The UI always reads from the cache
 * ([observeActiveQuestionnaire] / [activeQuestionnaire]).
 *
 * - [syncOnLogin] runs at the login boundary: it fetches the questionnaire from Firebase and caches
 *   it, seeding the bundled baseline first only when Firebase is confirmed empty.
 * - [refreshQuestionnaireIfStale] is called when the checklist screen opens: if the cached copy is
 *   older than the caller's TTL (e.g. 30 min) it re-fetches from Firebase; when offline/unreachable
 *   it keeps the existing cache.
 * - The bundled baseline only ever surfaces as an emergency fallback when there is no cache AND
 *   Firebase cannot be reached (so the app is never completely unusable on a fresh, offline first run).
 */
@Singleton
class ConfigRepositoryImpl @Inject constructor(
    private val rtdb: RtdbConfigSource,
    private val configCacheDao: ConfigCacheDao,
    private val baselineProvider: BaselineProvider,
    private val dispatchers: DispatcherProvider,
) : ConfigRepository {

    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    /**
     * When the app last *attempted* a questionnaire sync (success or failure), for the checklist
     * screen's staleness throttle. A failed fetch still advances this so we don't retry on every
     * screen open — we wait for the next interval instead. In-memory (singleton-scoped): a cold app
     * start re-attempts once, and login's [syncOnLogin] seeds it.
     */
    @Volatile private var lastSyncAttemptAt: Long = 0L

    override suspend fun activeQuestionnaire(): QuestionnaireConfig = withContext(dispatchers.io) {
        cachedQuestionnaire()?.also { Log.d(TAG, "activeQuestionnaire: served from cache v${it.version}") }
            ?: run {
                Log.i(TAG, "activeQuestionnaire: cache empty — syncing from Firebase")
                syncQuestionnaire("active-empty-cache")
            }
    }

    override fun observeActiveQuestionnaire(): Flow<QuestionnaireConfig> =
        configCacheDao.observe(QUESTIONNAIRE)
            .map { entity ->
                entity?.let(::decode)?.also { Log.d(TAG, "observeActiveQuestionnaire: emitting cached v${it.version}") }
                    ?: run {
                        Log.w(
                            TAG,
                            "observeActiveQuestionnaire: no cache — emitting EMPTY questionnaire " +
                                "(UI renders blank; the bundled baseline is never shown, only used to seed Firebase)",
                        )
                        EMPTY_QUESTIONNAIRE
                    }
            }
            .flowOn(dispatchers.io)

    override suspend fun syncOnLogin(): AppResult<QuestionnaireConfig> = withContext(dispatchers.io) {
        Log.i(TAG, "syncOnLogin: start")
        val adopted = syncQuestionnaire("login")

        // Best-effort vehicle catalog refresh (non-fatal).
        rtdb.fetchVehicleCatalog()?.let {
            Log.i(TAG, "syncOnLogin: cached vehicle catalog v${it.version}")
            cache(VEHICLE_CATALOG, it.version, it.hash, json.encodeToString(it))
        }

        Log.i(TAG, "syncOnLogin: done (active v${adopted.version})")
        AppResult.Success(adopted)
    }

    override suspend fun refreshQuestionnaireIfStale(maxAgeMillis: Long): QuestionnaireConfig =
        withContext(dispatchers.io) {
            val sinceAttempt = System.currentTimeMillis() - lastSyncAttemptAt
            if (sinceAttempt < maxAgeMillis) {
                // Attempted within the window (whether it succeeded or failed): skip to the next
                // interval. Never blocks, never errors — just serves the current cache.
                Log.d(TAG, "refreshQuestionnaireIfStale: attempted ${sinceAttempt}ms ago (< ${maxAgeMillis}ms) — skipping")
                cachedQuestionnaire() ?: EMPTY_QUESTIONNAIRE
            } else {
                Log.i(TAG, "refreshQuestionnaireIfStale: last attempt ${sinceAttempt}ms ago — refreshing")
                syncQuestionnaire("stale-refresh")
            }
        }

    override suspend fun vehicleCatalog(): VehicleCatalog? = withContext(dispatchers.io) {
        rtdb.fetchVehicleCatalog()?.also { cache(VEHICLE_CATALOG, it.version, it.hash, json.encodeToString(it)) }
            ?: configCacheDao.get(VEHICLE_CATALOG)?.let {
                runCatching { json.decodeFromString<VehicleCatalog>(it.json) }.getOrNull()
            }
    }

    /**
     * Pulls the questionnaire from Firebase and caches it, seeding the bundled baseline only when the
     * remote node is definitively absent. When Firebase is unreachable/unparseable it degrades to the
     * last cached copy (and, as a last resort on a fresh install, the bundled baseline) WITHOUT
     * overwriting whatever already lives in Firebase. Always populates the cache when it can.
     */
    private suspend fun syncQuestionnaire(reason: String): QuestionnaireConfig {
        // Record the attempt up-front so a failed fetch also advances the staleness window (the
        // checklist screen then waits for the next interval instead of retrying on every open).
        lastSyncAttemptAt = System.currentTimeMillis()
        val remote = rtdb.fetchQuestionnaire()
        if (remote != null) {
            Log.i(TAG, "syncQuestionnaire($reason): adopted Firebase questionnaire v${remote.version}")
            return normalize(remote).also { cacheQuestionnaire(it) }
        }

        return when (rtdb.questionnaireExists()) {
            // Firebase is definitively empty → seed the bundled baseline, then re-fetch so the cached
            // active version reflects Firebase's persisted copy.
            false -> {
                val baseline = baselineProvider.questionnaire()
                Log.i(TAG, "syncQuestionnaire($reason): Firebase empty — seeding baseline v${baseline.version}")
                val seeded = rtdb.seedQuestionnaire(baseline)
                val fromFirebase = rtdb.fetchQuestionnaire() ?: baseline
                Log.i(TAG, "syncQuestionnaire($reason): seed success=$seeded; caching v${fromFirebase.version}")
                normalize(fromFirebase).also { cacheQuestionnaire(it) }
            }

            // Firebase unreachable, or the node exists but is unparseable → keep the last cached
            // active version. When there is no cache we return an EMPTY questionnaire (never the
            // bundled baseline): the baseline is only ever written to Firebase, not rendered.
            else -> {
                val fallback = cachedQuestionnaire()
                if (fallback != null) {
                    Log.w(TAG, "syncQuestionnaire($reason): Firebase unavailable — keeping cached v${fallback.version}")
                    fallback
                } else {
                    Log.w(TAG, "syncQuestionnaire($reason): Firebase unavailable and no cache — returning EMPTY (baseline not rendered)")
                    EMPTY_QUESTIONNAIRE
                }
            }
        }
    }

    private suspend fun cachedQuestionnaire(): QuestionnaireConfig? =
        configCacheDao.get(QUESTIONNAIRE)?.let(::decode)

    private fun decode(entity: ConfigCacheEntity): QuestionnaireConfig? =
        runCatching { json.decodeFromString<QuestionnaireConfig>(entity.json) }.getOrNull()

    /** Ensures the stored config carries an authoritative content hash. */
    private fun normalize(config: QuestionnaireConfig): QuestionnaireConfig =
        config.copy(hash = ConfigHashing.hash(config))

    private suspend fun cacheQuestionnaire(config: QuestionnaireConfig) =
        cache(QUESTIONNAIRE, config.version, config.hash, json.encodeToString(config))

    private suspend fun cache(type: String, version: Int, hash: String, jsonPayload: String) {
        configCacheDao.upsert(
            ConfigCacheEntity(type, version, hash, jsonPayload, System.currentTimeMillis()),
        )
    }

    companion object {
        private const val TAG = "VspConfigSync"
        private const val QUESTIONNAIRE = "QUESTIONNAIRE"
        private const val VEHICLE_CATALOG = "VEHICLE_CATALOG"

        /**
         * Rendered when there is no cached questionnaire and Firebase can't be reached. An empty
         * config means the checklist UI shows nothing — by design we never render the bundled
         * baseline; it is only written to Firebase to seed a fresh vendor database.
         */
        private val EMPTY_QUESTIONNAIRE = QuestionnaireConfig(version = 0)
    }
}
