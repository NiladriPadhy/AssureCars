package com.assurecars.vehicleinspection.feature.capture

import android.annotation.SuppressLint
import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.view.LifecycleCameraController
import androidx.camera.view.PreviewView
import androidx.camera.view.video.AudioConfig
import androidx.camera.video.FileOutputOptions
import androidx.camera.video.Recording
import androidx.camera.video.VideoRecordEvent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.core.util.Consumer
import com.vsp.core.ui.components.PrimaryButton
import java.io.File
import java.util.concurrent.Executor

/**
 * CameraX video capture surface. Records a single clip and returns the saved MP4 path via
 * [onVideoCaptured] when recording stops successfully.
 */
@Composable
fun CameraVideoCapture(
    instruction: String,
    onVideoCaptured: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    var hasCamera by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
                PackageManager.PERMISSION_GRANTED,
        )
    }
    var hasAudio by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) ==
                PackageManager.PERMISSION_GRANTED,
        )
    }
    val cameraLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {
        hasCamera = it
    }
    val audioLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {
        hasAudio = it
    }
    LaunchedEffect(Unit) {
        if (!hasCamera) cameraLauncher.launch(Manifest.permission.CAMERA)
        if (!hasAudio) audioLauncher.launch(Manifest.permission.RECORD_AUDIO)
    }

    if (!hasCamera || !hasAudio) {
        Column(
            modifier = modifier
                .fillMaxSize()
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text("Camera and microphone permissions are required to record inspection videos.")
            if (!hasCamera) {
                PrimaryButton(text = "Grant camera permission", onClick = { cameraLauncher.launch(Manifest.permission.CAMERA) })
            }
            if (!hasAudio) {
                PrimaryButton(text = "Grant microphone permission", onClick = { audioLauncher.launch(Manifest.permission.RECORD_AUDIO) })
            }
        }
        return
    }

    VideoPreview(instruction = instruction, onVideoCaptured = onVideoCaptured, modifier = modifier)
}

@Composable
private fun VideoPreview(
    instruction: String,
    onVideoCaptured: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val controller = remember {
        LifecycleCameraController(context).apply {
            setEnabledUseCases(LifecycleCameraController.VIDEO_CAPTURE)
        }
    }
    val executor: Executor = remember(context) { ContextCompat.getMainExecutor(context) }
    var isRecording by remember { mutableStateOf(false) }
    var activeRecording by remember { mutableStateOf<Recording?>(null) }

    LaunchedEffect(Unit) { controller.bindToLifecycle(lifecycleOwner) }

    DisposableEffect(Unit) {
        onDispose {
            activeRecording?.stop()
        }
    }

    Box(modifier = modifier.fillMaxSize()) {
        AndroidView(
            modifier = Modifier
                .fillMaxSize()
                .semantics { contentDescription = "Video preview: $instruction" },
            factory = { ctx ->
                PreviewView(ctx).apply { this.controller = controller }
            },
        )

        if (instruction.isNotBlank()) {
            Surface(
                color = Color.Black.copy(alpha = 0.5f),
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .fillMaxWidth(),
            ) {
                Text(
                    text = instruction,
                    color = Color.White,
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(16.dp),
                )
            }
        }

        PrimaryButton(
            text = if (isRecording) "Stop recording" else "Start recording",
            onClick = startRecording@{
                if (isRecording) {
                    activeRecording?.stop()
                    activeRecording = null
                    isRecording = false
                } else {
                    val outputFile = File(context.cacheDir, "video_${System.currentTimeMillis()}.mp4")
                    val options = FileOutputOptions.Builder(outputFile).build()
                    val listener = { onVideoCaptured(outputFile.absolutePath) }
                    activeRecording = startRecordingWithAudio(controller, options, executor, listener)
                    isRecording = true
                }
            },
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(24.dp),
        )
    }
}

@SuppressLint("MissingPermission")
private fun startRecordingWithAudio(
    controller: LifecycleCameraController,
    options: FileOutputOptions,
    executor: Executor,
    onFinalized: () -> Unit,
): Recording {
    val listener = object : Consumer<VideoRecordEvent> {
        override fun accept(event: VideoRecordEvent) {
            if (event is VideoRecordEvent.Finalize && !event.hasError()) {
                onFinalized()
            }
        }
    }
    return controller.startRecording(options, AudioConfig.create(true), executor, listener)
}
