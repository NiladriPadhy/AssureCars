package com.assurecars.vehicleinspection.feature.checklist

import android.net.Uri
import android.widget.VideoView
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import java.io.File

@Composable
fun VideoPlaybackDialog(
    videoPath: String,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Video playback") },
        text = {
            AndroidView(
                modifier = Modifier.fillMaxWidth().height(220.dp),
                factory = { context ->
                    VideoView(context).apply {
                        val file = File(videoPath)
                        if (file.exists()) {
                            setVideoURI(Uri.fromFile(file))
                            setOnPreparedListener { player -> player.isLooping = false; start() }
                        }
                    }
                },
                onRelease = { it.stopPlayback() },
            )
        },
        confirmButton = {
            TextButton(onClick = onDismiss) { Text("Close") }
        },
    )
}
