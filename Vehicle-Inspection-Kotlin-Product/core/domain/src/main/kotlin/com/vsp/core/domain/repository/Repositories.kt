package com.vsp.core.domain.repository

import com.vsp.core.model.AIFinding
import com.vsp.core.model.Annotation
import com.vsp.core.model.AppResult
import com.vsp.core.model.ChecklistResponse
import com.vsp.core.model.Completeness
import com.vsp.core.model.ExportResult
import com.vsp.core.model.FinalVerification
import com.vsp.core.model.ImageQuality
import com.vsp.core.model.ImportPreview
import com.vsp.core.model.ImportResult
import com.vsp.core.model.Inspection
import com.vsp.core.model.InspectionContext
import com.vsp.core.model.InspectionImage
import com.vsp.core.model.InspectionListItem
import com.vsp.core.model.Report
import com.vsp.core.model.ReverifyResult
import com.vsp.core.model.Section
import com.vsp.core.model.Session
import com.vsp.core.model.SyncSummary
import com.vsp.core.model.Vehicle
import com.vsp.core.model.VehicleCategory
import com.vsp.core.model.config.QuestionnaireConfig
import com.vsp.core.model.config.VehicleCatalog
import com.vsp.core.model.organization.OrgUser
import com.vsp.core.model.organization.Organization
import com.vsp.core.model.subscription.Subscription
import com.vsp.core.model.subscription.SubscriptionTier
import kotlinx.coroutines.flow.Flow

interface AuthRepository {
    val session: Flow<Session?>

    /**
     * Authorizes the user against the backend `login` Cloud Function. On success a [Session]
     * (including the user's organisation) is persisted for offline app launches. Account creation is
     * an admin-only operation performed through the Admin app / Cloud Functions.
     */
    suspend fun signIn(email: String, password: String): AppResult<Session>
    suspend fun signOut(): AppResult<Unit>
    fun hasValidOfflineSession(): Boolean
}

/**
 * Vendor configuration (questionnaire + vehicle catalog) fetched from Firebase RTDB, cached locally,
 * and version-pinned. Adoption of a newer version is gated (feature 002 §10): only when there is no
 * local inspection data or at a login boundary.
 */
interface ConfigRepository {
    /** The questionnaire currently used for NEW inspections, served from the local cache. */
    suspend fun activeQuestionnaire(): QuestionnaireConfig

    /**
     * Live stream of the active questionnaire read from the local cache (which is populated from
     * Firebase on login and on the staleness-triggered refresh). Re-emits whenever the cached copy
     * changes. The bundled baseline is only emitted as an emergency fallback when no cache exists yet.
     */
    fun observeActiveQuestionnaire(): Flow<QuestionnaireConfig>

    /** Fetches remote config (seeding baseline for a fresh vendor DB) and caches it for the UI. */
    suspend fun syncOnLogin(): AppResult<QuestionnaireConfig>

    /**
     * Re-fetches the questionnaire from Firebase and refreshes the cache when the cached copy is
     * older than [maxAgeMillis] (or missing). When Firebase is offline/unreachable the existing cache
     * is kept. Intended to be called when opening the inspection checklist screen.
     */
    suspend fun refreshQuestionnaireIfStale(maxAgeMillis: Long): QuestionnaireConfig

    /** The active vehicle make/model/variant catalog, if any. */
    suspend fun vehicleCatalog(): VehicleCatalog?
}

/**
 * Free/Pro subscription state. The cached record is the source of truth for gating; the effective
 * tier is computed locally (so expiry downgrades even offline). Refreshed on login/app-start and
 * every ~30 minutes by a background worker. The app only ever reads (getSubscription); create/
 * update/delete are administered out-of-band via the Cloud Functions API.
 */
interface SubscriptionRepository {
    /** The cached subscription for the signed-in user's organisation (defaults to Free when none). */
    val subscription: Flow<Subscription>

    /** Fetches the latest subscription for organisation [orgId] from the API, caches it, and returns it. */
    suspend fun refresh(orgId: String): Subscription

    /**
     * Refreshes the cached subscription from the API when the cached copy is older than [maxAgeMillis].
     * Keeps the existing cache when the device is offline/unreachable or when no organisation is cached
     * yet. Intended to be called when opening the inspection checklist screen.
     */
    suspend fun refreshIfStale(maxAgeMillis: Long): Subscription

    /** One-off lookup for an organisation (no caching) — used by the admin subscription screen. */
    suspend fun lookup(orgId: String): AppResult<Subscription>

    /**
     * Admin: creates or updates (upsert) the subscription for organisation [orgId] to [tier] with an
     * optional [expiryMillis] (null = Lifetime for PRO / not-applicable for FREE). Requires an admin key.
     */
    suspend fun setSubscription(orgId: String, tier: SubscriptionTier, expiryMillis: Long?): AppResult<Subscription>

    /** Admin: deletes the subscription for organisation [orgId] (reverts to Free). Requires an admin key. */
    suspend fun deleteSubscription(orgId: String): AppResult<Unit>

    /** Clears the cached subscription (on sign-out). */
    suspend fun clear()
}

/**
 * Admin-only management of organisations and their member users, backed by the protected
 * organisation/user Cloud Functions (requires an admin API key). Used exclusively by the Admin app.
 */
interface OrganizationRepository {
    suspend fun listOrganisations(): AppResult<List<Organization>>
    suspend fun createOrganisation(name: String): AppResult<Organization>
    suspend fun updateOrganisation(id: String, name: String): AppResult<Organization>
    suspend fun deleteOrganisation(id: String): AppResult<Unit>

    suspend fun listUsers(orgId: String): AppResult<List<OrgUser>>
    suspend fun addUser(orgId: String, displayName: String, email: String, password: String): AppResult<OrgUser>
    suspend fun deleteUser(uid: String): AppResult<Unit>
}

interface ExportRepository {
    /** Bundles every inspection for the inspector (images + CSV + manifest) into a shareable zip. */
    suspend fun exportAll(inspectorId: String): AppResult<ExportResult>
}

interface ImportRepository {
    /** Validates a bundle (structure + questionnaire/CSV compatibility) without applying it. */
    suspend fun validate(zipPath: String): AppResult<ImportPreview>

    /** Validates then applies a bundle to the local store (device migration). */
    suspend fun import(zipPath: String, inspectorId: String): AppResult<ImportResult>
}

interface VehicleRepository {
    fun observeVehicle(id: String): Flow<Vehicle?>
    suspend fun decodeVin(vin: String): AppResult<Vehicle>
    suspend fun scanVinFromImage(imagePath: String): AppResult<String>
    suspend fun saveVehicle(vehicle: Vehicle): AppResult<Vehicle>
}

interface InspectionRepository {
    fun observeInspections(inspectorId: String): Flow<List<Inspection>>

    /** Inspections for the dashboard list, joined with each vehicle's VIN/RC, newest-added first. */
    fun observeInspectionList(inspectorId: String): Flow<List<InspectionListItem>>
    fun observeInspection(id: String): Flow<Inspection?>
    suspend fun startInspection(
        inspectorId: String,
        context: InspectionContext,
        category: VehicleCategory,
    ): AppResult<Inspection>
    suspend fun updateStep(id: String, step: String): AppResult<Unit>
    suspend fun getCompleteness(id: String): AppResult<Completeness>
    suspend fun finalize(id: String): AppResult<Unit>
    suspend fun deleteInspection(id: String): AppResult<Unit>

    /** The questionnaire pinned to this inspection (its snapshot), falling back to the active config. */
    suspend fun questionnaireFor(id: String): QuestionnaireConfig

    /**
     * Live questionnaire for rendering this inspection's checklist: the current Firebase questionnaire
     * restricted to the fields the inspection was created with. Questions removed from Firebase are
     * hidden (their captured answers are still retained in the pinned snapshot for the report), and
     * questions added afterwards are not introduced (they apply only to new inspections). Re-emits on
     * remote changes.
     */
    fun observeInspectionQuestionnaire(id: String): Flow<QuestionnaireConfig>
}

interface ImageRepository {
    fun observeImages(inspectionId: String): Flow<List<InspectionImage>>
    fun observeImage(imageId: String): Flow<InspectionImage?>
    suspend fun captureImage(
        inspectionId: String,
        section: Section,
        position: String,
        rawImagePath: String,
    ): AppResult<InspectionImage>
    suspend fun captureSectionImage(
        inspectionId: String,
        section: Section,
        checklistSectionId: String,
        checklistItemId: String?,
        rawImagePath: String,
    ): AppResult<InspectionImage>
    suspend fun captureSectionVideo(
        inspectionId: String,
        section: Section,
        checklistSectionId: String,
        checklistItemId: String?,
        rawVideoPath: String,
    ): AppResult<InspectionImage>
    suspend fun skipPosition(
        inspectionId: String,
        section: Section,
        position: String,
        reason: String,
    ): AppResult<Unit>
    suspend fun deleteImage(imageId: String): AppResult<Unit>
    suspend fun validateQuality(imagePath: String): AppResult<ImageQuality>
}

interface AnnotationRepository {
    fun observeAnnotations(imageId: String): Flow<List<Annotation>>
    suspend fun add(annotation: Annotation): AppResult<Annotation>
    suspend fun update(annotation: Annotation): AppResult<Unit>
    suspend fun delete(annotationId: String): AppResult<Unit>
}

interface AiAnalysisRepository {
    fun observeFindings(imageId: String): Flow<List<AIFinding>>
    suspend fun analyzeImage(image: InspectionImage): AppResult<List<AIFinding>>
    suspend fun reverifyAnnotation(image: InspectionImage, annotation: Annotation): AppResult<ReverifyResult>
    suspend fun runFinalVerification(inspectionId: String): AppResult<FinalVerification>
}

interface ReportRepository {
    fun observeReport(inspectionId: String): Flow<Report?>
    suspend fun generate(inspectionId: String): AppResult<Report>
    suspend fun share(inspectionId: String): AppResult<Unit>

    /** Renders a human-readable PDF report and returns the absolute file path. */
    suspend fun exportPdf(inspectionId: String): AppResult<String>
}

interface ChecklistRepository {
    fun observeResponses(inspectionId: String): Flow<List<ChecklistResponse>>
    suspend fun save(response: ChecklistResponse): AppResult<Unit>
}

interface SyncRepository {
    fun observeSyncStatus(inspectionId: String): Flow<SyncSummary>
    suspend fun enqueue(entityType: String, entityId: String, op: String): AppResult<Unit>
    suspend fun retryFailed(inspectionId: String): AppResult<Unit>
}
