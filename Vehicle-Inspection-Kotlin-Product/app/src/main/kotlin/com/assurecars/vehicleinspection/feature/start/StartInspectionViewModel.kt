package com.assurecars.vehicleinspection.feature.start

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.vsp.core.domain.usecase.DecodeVinUseCase
import com.assurecars.vehicleinspection.bootstrap.LocalSessionInitializer
import com.vsp.core.domain.usecase.SaveVehicleDetailsUseCase
import com.vsp.core.domain.usecase.StartInspectionUseCase
import com.vsp.core.model.AppResult
import com.vsp.core.model.InspectionContext
import com.vsp.core.model.Vehicle
import com.vsp.core.model.VehicleCategory
import com.assurecars.vehicleinspection.feature.common.errorMessage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class StartUiState(
    val context: InspectionContext = InspectionContext.RESALE,
    val category: VehicleCategory = VehicleCategory.NEW,
    val vin: String = "",
    val registrationNumber: String = "",
    val isSubmitting: Boolean = false,
    val error: String? = null,
    val createdInspectionId: String? = null,
) {
    val registrationRequired: Boolean get() = category == VehicleCategory.OLD
    val canSubmit: Boolean
        get() = vin.isNotBlank() && (!registrationRequired || registrationNumber.isNotBlank())
}

@HiltViewModel
class StartInspectionViewModel @Inject constructor(
    private val startInspection: StartInspectionUseCase,
    private val decodeVin: DecodeVinUseCase,
    private val saveVehicle: SaveVehicleDetailsUseCase,
) : ViewModel() {

    private val _state = MutableStateFlow(StartUiState())
    val state: StateFlow<StartUiState> = _state.asStateFlow()

    fun onContextChange(value: InspectionContext) = _state.update { it.copy(context = value) }
    fun onCategoryChange(value: VehicleCategory) = _state.update { it.copy(category = value, error = null) }
    fun onVinChange(value: String) = _state.update { it.copy(vin = value.uppercase(), error = null) }
    fun onRegistrationChange(value: String) = _state.update { it.copy(registrationNumber = value.uppercase(), error = null) }

    fun submit() {
        val current = _state.value
        if (current.isSubmitting || !current.canSubmit) return
        _state.update { it.copy(isSubmitting = true, error = null) }
        viewModelScope.launch {
            val inspectorId = LocalSessionInitializer.DEFAULT_INSPECTOR_ID
            when (val started = startInspection(inspectorId, current.context, current.category)) {
                is AppResult.Failure ->
                    _state.update { it.copy(isSubmitting = false, error = started.error.errorMessage()) }
                is AppResult.Success -> {
                    val inspection = started.value
                    val decoded = (decodeVin(current.vin) as? AppResult.Success)?.value
                    val vehicle = (decoded ?: Vehicle(id = inspection.vehicleId)).copy(
                        id = inspection.vehicleId,
                        vin = current.vin,
                        category = current.category,
                        registrationNumber = current.registrationNumber.ifBlank { null },
                    )
                    saveVehicle(vehicle)
                    _state.update { it.copy(isSubmitting = false, createdInspectionId = inspection.id) }
                }
            }
        }
    }
}
