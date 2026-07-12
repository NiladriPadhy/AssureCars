package com.assurecars.vehicleinspection.feature.identify

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.navigation.toRoute
import com.vsp.core.domain.usecase.DecodeVinUseCase
import com.vsp.core.domain.usecase.ObserveVehicleUseCase
import com.vsp.core.domain.usecase.ResumeInspectionUseCase
import com.vsp.core.domain.usecase.SaveVehicleDetailsUseCase
import com.vsp.core.domain.usecase.ScanVinFromImageUseCase
import com.vsp.core.model.AppResult
import com.vsp.core.model.Vehicle
import com.vsp.core.model.VehicleCategory
import com.assurecars.vehicleinspection.feature.common.errorMessage
import com.assurecars.vehicleinspection.navigation.VspRoute
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class IdentifyUiState(
    val loaded: Boolean = false,
    val vin: String = "",
    val registrationNumber: String = "",
    val manufacturer: String = "",
    val make: String = "",
    val model: String = "",
    val variant: String = "",
    val trim: String = "",
    val bodyStyle: String = "",
    val fuelType: String = "",
    val transmission: String = "",
    val year: String = "",
    val color: String = "",
    val engineNumber: String = "",
    val chassisNumber: String = "",
    val odometer: String = "",
    val numberOfOwnerships: String = "",
    val numberOfKeys: String = "",
    val category: VehicleCategory = VehicleCategory.NEW,
    val scanning: Boolean = false,
    val saving: Boolean = false,
    val error: String? = null,
    val done: Boolean = false,
)

@HiltViewModel
class IdentifyViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val resumeInspection: ResumeInspectionUseCase,
    private val observeVehicle: ObserveVehicleUseCase,
    private val saveVehicle: SaveVehicleDetailsUseCase,
    private val scanVin: ScanVinFromImageUseCase,
    private val decodeVin: DecodeVinUseCase,
) : ViewModel() {

    private val route = savedStateHandle.toRoute<VspRoute.IdentifyVehicle>()
    val inspectionId: String = route.inspectionId
    private var vehicleId: String? = null

    private val _state = MutableStateFlow(IdentifyUiState())
    val state: StateFlow<IdentifyUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            val inspection = resumeInspection(inspectionId).first() ?: return@launch
            vehicleId = inspection.vehicleId
            val vehicle = observeVehicle(inspection.vehicleId).first()
            _state.update { current ->
                current.copy(
                    loaded = true,
                    category = inspection.vehicleCategory,
                    vin = vehicle?.vin.orEmpty(),
                    registrationNumber = vehicle?.registrationNumber.orEmpty(),
                    manufacturer = vehicle?.manufacturer.orEmpty(),
                    make = vehicle?.make.orEmpty(),
                    model = vehicle?.model.orEmpty(),
                    variant = vehicle?.variant.orEmpty(),
                    trim = vehicle?.trim.orEmpty(),
                    bodyStyle = vehicle?.bodyStyle.orEmpty(),
                    fuelType = vehicle?.fuelType.orEmpty(),
                    transmission = vehicle?.transmission.orEmpty(),
                    year = vehicle?.year?.toString().orEmpty(),
                    color = vehicle?.color.orEmpty(),
                    engineNumber = vehicle?.engineNumber.orEmpty(),
                    chassisNumber = vehicle?.chassisNumber.orEmpty(),
                    odometer = vehicle?.odometerKm?.toString().orEmpty(),
                    numberOfOwnerships = vehicle?.numberOfOwnerships?.toString().orEmpty(),
                    numberOfKeys = vehicle?.numberOfKeys?.toString().orEmpty(),
                )
            }
        }
    }

    fun onVinChange(v: String) = _state.update { it.copy(vin = v.uppercase(), error = null) }
    fun onRegistrationChange(v: String) = _state.update { it.copy(registrationNumber = v.uppercase(), error = null) }
    fun onManufacturerChange(v: String) = _state.update { it.copy(manufacturer = v) }
    fun onMakeChange(v: String) = _state.update { it.copy(make = v) }
    fun onModelChange(v: String) = _state.update { it.copy(model = v) }
    fun onVariantChange(v: String) = _state.update { it.copy(variant = v) }
    fun onTrimChange(v: String) = _state.update { it.copy(trim = v) }
    fun onBodyStyleChange(v: String) = _state.update { it.copy(bodyStyle = v) }
    fun onFuelTypeChange(v: String) = _state.update { it.copy(fuelType = v) }
    fun onTransmissionChange(v: String) = _state.update { it.copy(transmission = v) }
    fun onYearChange(v: String) = _state.update { it.copy(year = v.filter(Char::isDigit)) }
    fun onColorChange(v: String) = _state.update { it.copy(color = v) }
    fun onEngineNumberChange(v: String) = _state.update { it.copy(engineNumber = v.uppercase()) }
    fun onChassisNumberChange(v: String) = _state.update { it.copy(chassisNumber = v.uppercase()) }
    fun onOdometerChange(v: String) = _state.update { it.copy(odometer = v.filter(Char::isDigit)) }
    fun onOwnershipsChange(v: String) = _state.update { it.copy(numberOfOwnerships = v.filter(Char::isDigit)) }
    fun onKeysChange(v: String) = _state.update { it.copy(numberOfKeys = v.filter(Char::isDigit)) }

    fun onVinScanned(imagePath: String) {
        _state.update { it.copy(scanning = true, error = null) }
        viewModelScope.launch {
            when (val scan = scanVin(imagePath)) {
                is AppResult.Success -> {
                    val vin = scan.value
                    val decoded = (decodeVin(vin) as? AppResult.Success)?.value
                    _state.update {
                        it.copy(
                            scanning = false,
                            vin = vin,
                            manufacturer = decoded?.manufacturer ?: it.manufacturer,
                            year = decoded?.year?.toString() ?: it.year,
                        )
                    }
                }
                is AppResult.Failure -> _state.update { it.copy(scanning = false, error = scan.error.errorMessage()) }
            }
        }
    }

    fun save() {
        val current = _state.value
        val id = vehicleId ?: return
        if (current.saving) return
        _state.update { it.copy(saving = true, error = null) }
        viewModelScope.launch {
            val existing = observeVehicle(id).first() ?: Vehicle(id = id)
            val updated = existing.copy(
                vin = current.vin.ifBlank { null },
                registrationNumber = current.registrationNumber.ifBlank { null },
                manufacturer = current.manufacturer.ifBlank { null },
                make = current.make.ifBlank { null },
                model = current.model.ifBlank { null },
                variant = current.variant.ifBlank { null },
                trim = current.trim.ifBlank { null },
                bodyStyle = current.bodyStyle.ifBlank { null },
                fuelType = current.fuelType.ifBlank { null },
                transmission = current.transmission.ifBlank { null },
                year = current.year.toIntOrNull(),
                color = current.color.ifBlank { null },
                engineNumber = current.engineNumber.ifBlank { null },
                chassisNumber = current.chassisNumber.ifBlank { null },
                odometerKm = current.odometer.toIntOrNull(),
                numberOfOwnerships = current.numberOfOwnerships.toIntOrNull(),
                numberOfKeys = current.numberOfKeys.toIntOrNull(),
                category = current.category,
            )
            when (val result = saveVehicle(updated)) {
                is AppResult.Success -> _state.update { it.copy(saving = false, done = true) }
                is AppResult.Failure -> _state.update { it.copy(saving = false, error = result.error.errorMessage()) }
            }
        }
    }
}
