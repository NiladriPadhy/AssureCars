package com.assurecars.vehicleinspection.feature.checklist

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.vsp.core.ui.components.ErrorBanner
import com.vsp.core.ui.components.LoadingOverlay
import com.vsp.core.ui.components.VspScaffold
import com.assurecars.vehicleinspection.feature.capture.CameraVideoCapture

/**
 * Single-clip video capture for checklist items (engine noise, exhaust). The user records one video
 * and presses back (Previous) to return; there is no multi-photo session flow.
 */
@Composable
fun SectionVideoCaptureScreen(
    onExit: () -> Unit,
    viewModel: SectionVideoCaptureViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(state.done) { if (state.done) onExit() }

    BackHandler { viewModel.onBackRequested() }

    VspScaffold(title = "Record video", onBack = viewModel::onBackRequested) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            CameraVideoCapture(
                instruction = if (state.limitReached) {
                    "Recording will replace the existing video. Press Previous when done."
                } else {
                    "Record the sound or exhaust clip, then press Previous to return."
                },
                onVideoCaptured = viewModel::saveVideo,
            )

            if (state.isBusy) LoadingOverlay(message = "Saving video…")
            state.error?.let { ErrorBanner(message = it, onRetry = viewModel::clearError) }
        }
    }
}
