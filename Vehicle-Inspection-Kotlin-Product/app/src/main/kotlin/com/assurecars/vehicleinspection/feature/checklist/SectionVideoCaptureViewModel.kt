package com.assurecars.vehicleinspection.feature.checklist

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.navigation.toRoute
import com.vsp.core.domain.usecase.CaptureSectionVideoUseCase
import com.vsp.core.domain.usecase.DeleteImageUseCase
import com.vsp.core.domain.usecase.GetItemVideoLimitUseCase
import com.vsp.core.domain.usecase.ObserveImagesUseCase
import com.vsp.core.model.AppResult
import com.vsp.core.model.CaptureState
import com.vsp.core.model.InspectionImage
import com.vsp.core.model.MediaType
import com.vsp.core.model.Section
import com.assurecars.vehicleinspection.feature.common.errorMessage
import com.assurecars.vehicleinspection.navigation.VspRoute
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SectionVideoCaptureUiState(
    val isBusy: Boolean = false,
    val error: String? = null,
    val max: Int = 1,
    val totalCount: Int = 0,
    val limitReached: Boolean = false,
    val done: Boolean = false,
)

@HiltViewModel
class SectionVideoCaptureViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    observeImages: ObserveImagesUseCase,
    private val captureSectionVideo: CaptureSectionVideoUseCase,
    private val deleteImage: DeleteImageUseCase,
    private val getItemVideoLimit: GetItemVideoLimitUseCase,
) : ViewModel() {

    private val route = savedStateHandle.toRoute<VspRoute.SectionVideoCapture>()
    private val inspectionId = route.inspectionId
    private val checklistSectionId = route.sectionId
    private val checklistItemId = route.itemId
    private val section = runCatching { Section.valueOf(route.section) }.getOrDefault(Section.EXTERIOR)

    private val _state = MutableStateFlow(SectionVideoCaptureUiState())
    val state: StateFlow<SectionVideoCaptureUiState> = _state.asStateFlow()

    private var existingVideoIds: List<String> = emptyList()

    init {
        viewModelScope.launch {
            val limit = getItemVideoLimit(inspectionId, checklistItemId)
            _state.update {
                it.copy(max = limit.maxVideos, limitReached = it.totalCount >= limit.maxVideos)
            }
        }
        viewModelScope.launch {
            observeImages(inspectionId).collect { images ->
                val videos = images.filter { it.captureState == CaptureState.CAPTURED && belongsHere(it) && it.mediaType == MediaType.VIDEO }
                existingVideoIds = videos.map { it.id }
                val count = videos.size
                _state.update {
                    it.copy(
                        totalCount = count,
                        limitReached = count >= it.max,
                    )
                }
            }
        }
    }

    fun saveVideo(rawVideoPath: String) {
        if (_state.value.isBusy) return
        _state.update { it.copy(isBusy = true, error = null) }
        viewModelScope.launch {
            if (_state.value.limitReached) {
                existingVideoIds.forEach { deleteImage(it) }
            }
            when (val result = captureSectionVideo(inspectionId, section, checklistSectionId, checklistItemId, rawVideoPath)) {
                is AppResult.Success ->
                    _state.update { it.copy(isBusy = false, done = true) }
                is AppResult.Failure ->
                    _state.update { it.copy(isBusy = false, error = result.error.errorMessage()) }
            }
        }
    }

    /** Back/Previous exits without a discard prompt; videos are saved when recording stops. */
    fun onBackRequested() = _state.update { it.copy(done = true) }

    fun clearError() = _state.update { it.copy(error = null) }

    private fun belongsHere(image: InspectionImage): Boolean =
        if (checklistItemId != null) {
            image.checklistItemId == checklistItemId
        } else {
            image.checklistItemId == null && image.checklistSectionId == checklistSectionId
        }
}
