package com.vsp.core.domain.usecase

import com.vsp.core.domain.repository.ConfigRepository
import com.vsp.core.domain.repository.InspectionRepository
import com.vsp.core.model.AppResult
import com.vsp.core.model.config.QuestionnaireConfig
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

/**
 * Synchronizes vendor configuration at a login boundary. Adoption of a newer questionnaire version
 * is gated inside [ConfigRepository] (only when there is no local inspection data or on re-login),
 * so calling this on every login is safe: existing inspections keep their pinned snapshot.
 */
class SyncConfigUseCase @Inject constructor(
    private val configRepository: ConfigRepository,
) {
    suspend operator fun invoke(): AppResult<QuestionnaireConfig> = configRepository.syncOnLogin()
}

class GetActiveQuestionnaireUseCase @Inject constructor(
    private val configRepository: ConfigRepository,
) {
    suspend operator fun invoke(): QuestionnaireConfig = configRepository.activeQuestionnaire()
}

/** Live stream of the cached active questionnaire (refreshed from Firebase on login / staleness). */
class ObserveActiveQuestionnaireUseCase @Inject constructor(
    private val configRepository: ConfigRepository,
) {
    operator fun invoke(): Flow<QuestionnaireConfig> = configRepository.observeActiveQuestionnaire()
}

/**
 * Refreshes the cached questionnaire from Firebase when it is older than [DEFAULT_MAX_AGE_MS]
 * (30 minutes). Called when the inspection checklist screen opens; keeps the existing cache when the
 * device is offline or Firebase is unreachable.
 */
class RefreshQuestionnaireIfStaleUseCase @Inject constructor(
    private val configRepository: ConfigRepository,
) {
    suspend operator fun invoke(maxAgeMillis: Long = DEFAULT_MAX_AGE_MS): QuestionnaireConfig =
        configRepository.refreshQuestionnaireIfStale(maxAgeMillis)

    companion object {
        /** 30 minutes. */
        const val DEFAULT_MAX_AGE_MS: Long = 30L * 60L * 1000L
    }
}

/**
 * Returns the active cached questionnaire for an inspection. Vendor edits in Firebase are reflected
 * after the cache is refreshed (login, dashboard load, or checklist staleness check).
 */
class GetInspectionQuestionnaireUseCase @Inject constructor(
    private val inspectionRepository: InspectionRepository,
) {
    suspend operator fun invoke(inspectionId: String): QuestionnaireConfig =
        inspectionRepository.questionnaireFor(inspectionId)
}

/**
 * Live questionnaire for rendering an inspection's checklist and reports. Emits the cached active
 * configuration (refreshed from Firebase on login and staleness checks) so vendor edits appear
 * without an app redeploy.
 */
class ObserveInspectionQuestionnaireUseCase @Inject constructor(
    private val inspectionRepository: InspectionRepository,
) {
    operator fun invoke(inspectionId: String): Flow<QuestionnaireConfig> =
        inspectionRepository.observeInspectionQuestionnaire(inspectionId)
}

/** Per-question photo limit ([maxImages]) for a given item, read from the inspection's snapshot. */
class GetItemImageLimitUseCase @Inject constructor(
    private val inspectionRepository: InspectionRepository,
) {
    data class Limit(val allowImage: Boolean, val maxImages: Int)

    suspend operator fun invoke(inspectionId: String, itemId: String?, fallbackMax: Int): Limit {
        if (itemId == null) return Limit(allowImage = true, maxImages = fallbackMax)
        val item = inspectionRepository.questionnaireFor(inspectionId).item(itemId)
            ?: return Limit(allowImage = true, maxImages = fallbackMax)
        val max = if (item.allowImage) item.maxImages.takeIf { it > 0 } ?: fallbackMax else 0
        return Limit(allowImage = item.allowImage, maxImages = max)
    }
}

/** Per-question video limit ([maxVideos]) for a given item, read from the inspection's snapshot. */
class GetItemVideoLimitUseCase @Inject constructor(
    private val inspectionRepository: InspectionRepository,
) {
    data class Limit(val allowVideo: Boolean, val maxVideos: Int)

    suspend operator fun invoke(inspectionId: String, itemId: String?, fallbackMax: Int = 1): Limit {
        if (itemId == null) return Limit(allowVideo = false, maxVideos = 0)
        val item = inspectionRepository.questionnaireFor(inspectionId).item(itemId)
            ?: return Limit(allowVideo = false, maxVideos = 0)
        val max = if (item.allowVideo) item.maxVideos.takeIf { it > 0 } ?: fallbackMax else 0
        return Limit(allowVideo = item.allowVideo, maxVideos = max)
    }
}
