package com.assurecars.vehicleinspection.feature.report

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.navigation.toRoute
import com.vsp.core.data.report.ReportDto
import com.vsp.core.data.report.VehicleReportDetails
import com.vsp.core.domain.usecase.ExportReportPdfUseCase
import com.vsp.core.domain.usecase.GenerateReportUseCase
import com.vsp.core.domain.usecase.ObserveReportUseCase
import com.vsp.core.domain.usecase.ObserveSessionUseCase
import com.vsp.core.model.AppResult
import com.vsp.core.model.RepairRecommendation
import com.vsp.core.model.Report
import com.vsp.core.model.Valuation
import com.assurecars.vehicleinspection.feature.common.errorMessage
import com.assurecars.vehicleinspection.navigation.VspRoute
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import javax.inject.Inject
import kotlin.math.roundToInt

data class ReportUiState(
    val generating: Boolean = false,
    val exportingPdf: Boolean = false,
    val pdfPath: String? = null,
    val message: String? = null,
)

/** A single label/value row for the vehicle detail and "at a glance" cards. */
data class DetailRow(val label: String, val value: String)

/** A category rating for the inspection summary (mirrors the PDF summary cards). */
data class CategoryRating(val label: String, val rating: Int)

/** Structured, display-ready report content parsed from the generated report JSON. */
data class ReportContent(
    val vehicleTitle: String,
    val subtitle: String,
    val vehicleDetails: List<DetailRow>,
    val glanceDetails: List<DetailRow>,
    val overallRating: Int?,
    val categoryRatings: List<CategoryRating>,
    val recommendation: String?,
    val valuation: Valuation?,
)

@HiltViewModel
class ReportViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    observeReport: ObserveReportUseCase,
    private val generateReport: GenerateReportUseCase,
    private val exportReportPdf: ExportReportPdfUseCase,
    observeSession: ObserveSessionUseCase,
) : ViewModel() {

    val inspectionId: String = savedStateHandle.toRoute<VspRoute.Report>().inspectionId

    val report: StateFlow<Report?> =
        observeReport(inspectionId).stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)

    private val orgName = observeSession().map { it?.orgName.orEmpty() }

    val content: StateFlow<ReportContent?> =
        combine(report, orgName) { report, org ->
            report?.let { buildContent(it, org) }
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)

    private val _state = MutableStateFlow(ReportUiState())
    val state: StateFlow<ReportUiState> = _state.asStateFlow()

    init {
        // Always regenerate on entry so edits made after a prior generation are reflected.
        generate()
    }

    fun generate() {
        if (_state.value.generating) return
        _state.update { it.copy(generating = true, message = null) }
        viewModelScope.launch {
            val message = when (val result = generateReport(inspectionId)) {
                is AppResult.Success -> null
                is AppResult.Failure -> result.error.errorMessage()
            }
            _state.update { it.copy(generating = false, message = message) }
        }
    }

    fun exportPdf() {
        if (_state.value.exportingPdf) return
        _state.update { it.copy(exportingPdf = true, message = null) }
        viewModelScope.launch {
            // Regenerate JSON first so the on-screen summary and PDF share the latest vehicle data.
            generateReport(inspectionId)
            when (val result = exportReportPdf(inspectionId)) {
                is AppResult.Success ->
                    _state.update { it.copy(exportingPdf = false, pdfPath = result.value) }
                is AppResult.Failure ->
                    _state.update { it.copy(exportingPdf = false, message = result.error.errorMessage()) }
            }
        }
    }

    fun consumePdfPath() = _state.update { it.copy(pdfPath = null) }

    fun consumeMessage() = _state.update { it.copy(message = null) }

    // ---- Report JSON → display content --------------------------------------

    private fun buildContent(report: Report, orgName: String): ReportContent? {
        val dto = runCatching { json.decodeFromString(ReportDto.serializer(), report.json) }.getOrNull()
            ?: return null
        val v = dto.vehicle
        val company = orgName.takeIf { it.isNotBlank() }

        val subtitle = VehicleReportDetails.subtitle(v)

        val vehicleDetails = VehicleReportDetails.rows(v).map { DetailRow(it.label, it.value) }

        val glanceDetails = buildList {
            company?.let { add(DetailRow("Company Name", it)) }
            dto.context?.takeIf { it.isNotBlank() }?.let {
                add(DetailRow("Inspection context", it.replace('_', ' ')))
            }
            val inspectionDate = dto.inspectionTime.completedAt ?: dto.inspectionTime.createdAt
            add(DetailRow("Inspection date", formatDate(inspectionDate)))
            add(DetailRow("Report generated", formatDate(report.generatedAt)))
            addAll(VehicleReportDetails.rows(v).map { DetailRow(it.label, it.value) })
        }

        val recommendation = dto.finalAssessment?.recommendation
            ?.takeIf { it.isNotBlank() }
            ?.let(::recommendationLabel)
            ?: dto.finalRecommendation.takeIf { it.isNotBlank() }?.let(::recommendationLabel)

        return ReportContent(
            vehicleTitle = vehicleTitle(dto),
            subtitle = subtitle,
            vehicleDetails = vehicleDetails,
            glanceDetails = glanceDetails,
            overallRating = overallRating(dto),
            categoryRatings = dto.finalAssessment?.categoryRatings
                ?.map { (label, rating) -> CategoryRating(label, rating.coerceIn(1, 5)) }
                .orEmpty(),
            recommendation = recommendation,
            valuation = dto.valuation,
        )
    }

    private fun vehicleTitle(dto: ReportDto): String {
        val v = dto.vehicle
        return listOfNotNull(v.manufacturer, v.make, v.model).joinToString(" ").ifBlank {
            v.vin ?: v.registrationNumber ?: "Vehicle Inspection"
        }.uppercase(Locale.getDefault())
    }

    private fun overallRating(dto: ReportDto): Int? {
        val ratings = dto.finalAssessment?.categoryRatings?.values?.toList().orEmpty()
        if (ratings.isNotEmpty()) return ratings.average().roundToInt().coerceIn(1, 5)
        var perfect = 0
        var imperfect = 0
        dto.checklist.forEach { section ->
            section.items.forEach { item ->
                when (verdict(item.status)) {
                    1 -> perfect++
                    -1 -> imperfect++
                }
            }
        }
        val total = perfect + imperfect
        if (total == 0) return null
        return (perfect.toDouble() / total * 5).roundToInt().coerceIn(1, 5)
    }

    private fun verdict(status: String?): Int = when (status) {
        "OK", "YES", "PASS", "GOOD" -> 1
        "NOT_OK", "NO", "FAIL", "MINOR_SCRATCHES", "MAJOR_SCRATCHES", "DAMAGE" -> -1
        else -> 0
    }

    private fun recommendationLabel(value: String): String =
        RepairRecommendation.entries.firstOrNull { it.name == value }?.label ?: value

    private fun formatDate(millis: Long): String =
        SimpleDateFormat("dd MMM yyyy, HH:mm", Locale.getDefault()).format(Date(millis))

    private companion object {
        val json = Json { ignoreUnknownKeys = true }
    }
}
