package com.assurecars.vehicleinspection.feature.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.vsp.core.domain.usecase.DeleteInspectionUseCase
import com.vsp.core.domain.usecase.ObserveInspectionListUseCase
import com.vsp.core.domain.usecase.ObserveSessionUseCase
import com.vsp.core.domain.usecase.RefreshQuestionnaireIfStaleUseCase
import com.vsp.core.model.InspectionListItem
import com.vsp.core.model.Session
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class DashboardUiState(
    val displayName: String = "",
    val items: List<InspectionListItem> = emptyList(),
    val query: String = "",
    val loading: Boolean = true,
)

@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class DashboardViewModel @Inject constructor(
    observeSession: ObserveSessionUseCase,
    observeInspectionList: ObserveInspectionListUseCase,
    private val deleteInspection: DeleteInspectionUseCase,
    private val refreshQuestionnaireIfStale: RefreshQuestionnaireIfStaleUseCase,
) : ViewModel() {

    init {
        viewModelScope.launch { runCatching { refreshQuestionnaireIfStale() } }
    }

    private val sessionFlow = observeSession()
    private val queryFlow = MutableStateFlow("")

    val state: StateFlow<DashboardUiState> =
        sessionFlow.flatMapLatest { session: Session? ->
            if (session == null) {
                flowOf(DashboardUiState(loading = false))
            } else {
                combine(observeInspectionList(session.inspectorId), queryFlow) { list, query ->
                    DashboardUiState(
                        displayName = session.displayName,
                        items = list.filterByQuery(query),
                        query = query,
                        loading = false,
                    )
                }
            }
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), DashboardUiState())

    fun onQueryChange(value: String) {
        queryFlow.value = value
    }

    fun delete(inspectionId: String) {
        viewModelScope.launch { deleteInspection(inspectionId) }
    }
}

/** Filters by VIN or RC (registration) number, case-insensitive; blank query keeps everything. */
private fun List<InspectionListItem>.filterByQuery(query: String): List<InspectionListItem> {
    val trimmed = query.trim()
    if (trimmed.isEmpty()) return this
    return filter { item ->
        item.vin?.contains(trimmed, ignoreCase = true) == true ||
            item.registrationNumber?.contains(trimmed, ignoreCase = true) == true
    }
}
