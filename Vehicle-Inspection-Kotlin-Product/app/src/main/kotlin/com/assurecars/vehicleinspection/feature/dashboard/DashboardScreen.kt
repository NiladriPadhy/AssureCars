package com.assurecars.vehicleinspection.feature.dashboard

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.outlined.Info
import androidx.compose.ui.Alignment
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.vsp.core.model.Inspection
import com.vsp.core.model.InspectionListItem
import com.vsp.core.model.InspectionStatus
import com.vsp.core.model.VehicleCategory
import com.vsp.core.ui.components.EmptyState
import com.vsp.core.ui.components.LoadingOverlay
import com.vsp.core.ui.components.StatusPill
import com.vsp.core.ui.components.VspCard
import com.vsp.core.ui.components.VspScaffold
import com.assurecars.vehicleinspection.feature.common.AboutDialog
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun DashboardScreen(
    onNewInspection: () -> Unit,
    onResume: (Inspection) -> Unit,
    onOpenChecklist: (Inspection) -> Unit,
    onOpenData: () -> Unit = {},
    viewModel: DashboardViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var showAbout by remember { mutableStateOf(false) }

    if (showAbout) AboutDialog(onDismiss = { showAbout = false })

    VspScaffold(
        title = "Inspections",
        actions = {
            IconButton(onClick = { showAbout = true }) {
                Icon(Icons.Outlined.Info, contentDescription = "About this app")
            }
            IconButton(onClick = onOpenData) {
                Icon(Icons.Filled.Share, contentDescription = "Backup & transfer")
            }
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                text = { Text("New inspection") },
                icon = { Icon(Icons.Filled.Add, contentDescription = null) },
                onClick = onNewInspection,
                modifier = Modifier.semantics { contentDescription = "Start a new inspection" },
            )
        },
    ) { padding ->
        when {
            state.loading -> LoadingOverlay()
            state.items.isEmpty() && state.query.isBlank() -> EmptyState(
                title = "No inspections yet",
                subtitle = "Tap the button below to start a new vehicle inspection.",
                icon = Icons.Filled.DirectionsCar,
                modifier = Modifier.padding(padding),
            )
            else -> Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
            ) {
                OutlinedTextField(
                    value = state.query,
                    onValueChange = viewModel::onQueryChange,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp)
                        .semantics { contentDescription = "Search by VIN or RC number" },
                    singleLine = true,
                    leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                    trailingIcon = {
                        if (state.query.isNotEmpty()) {
                            IconButton(onClick = { viewModel.onQueryChange("") }) {
                                Icon(Icons.Filled.Clear, contentDescription = "Clear search")
                            }
                        }
                    },
                    placeholder = { Text("Search by VIN / RC number") },
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(imeAction = ImeAction.Search),
                )

                if (state.items.isEmpty()) {
                    EmptyState(
                        title = "No matches",
                        subtitle = "No inspection matches \"${state.query}\".",
                        icon = Icons.Filled.Search,
                    )
                } else {
                    val grouped = remember(state.items) {
                        state.items.groupBy { startOfDayMillis(it.inspection.createdAt) }
                    }
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(horizontal = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        grouped.forEach { (dayMillis, itemsForDay) ->
                            stickyHeader(key = "header-$dayMillis") {
                                DateHeader(label = dateHeaderLabel(dayMillis))
                            }
                            items(itemsForDay, key = { it.inspection.id }) { item ->
                                InspectionCard(
                                    item = item,
                                    onClick = { onResume(item.inspection) },
                                    onOpenChecklist = { onOpenChecklist(item.inspection) },
                                    onDelete = { viewModel.delete(item.inspection.id) },
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DateHeader(label: String) {
    Surface(
        color = MaterialTheme.colorScheme.surface,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(vertical = 8.dp),
        )
    }
}

@Composable
private fun InspectionCard(
    item: InspectionListItem,
    onClick: () -> Unit,
    onOpenChecklist: () -> Unit,
    onDelete: () -> Unit,
) {
    val inspection = item.inspection
    var showDeleteDialog by remember { mutableStateOf(false) }
    val completed = inspection.status == InspectionStatus.COMPLETED
    val isOld = inspection.vehicleCategory == VehicleCategory.OLD

    VspCard(
        modifier = Modifier
            .semantics { contentDescription = "Inspection ${inspection.id}, status ${inspection.status.name}" },
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Surface(
                shape = MaterialTheme.shapes.medium,
                color = MaterialTheme.colorScheme.primaryContainer,
                modifier = Modifier.padding(start = 16.dp).clip(MaterialTheme.shapes.medium),
            ) {
                Icon(
                    Icons.Filled.DirectionsCar,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onPrimaryContainer,
                    modifier = Modifier.padding(10.dp),
                )
            }
            Column(
                modifier = Modifier
                    .weight(1f)
                    .clickable(onClick = onClick)
                    .padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text(
                    text = "${inspection.context.name.replace('_', ' ')} • ${inspection.vehicleCategory.name}",
                    style = MaterialTheme.typography.titleMedium,
                )
                StatusPill(
                    text = inspection.status.name.replace('_', ' '),
                    containerColor = if (completed) {
                        MaterialTheme.colorScheme.tertiaryContainer
                    } else {
                        MaterialTheme.colorScheme.secondaryContainer
                    },
                    contentColor = if (completed) {
                        MaterialTheme.colorScheme.onTertiaryContainer
                    } else {
                        MaterialTheme.colorScheme.onSecondaryContainer
                    },
                )
                Text(
                    text = "VIN: ${item.vin?.ifBlank { null } ?: "—"}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                if (isOld) {
                    Text(
                        text = "RC: ${item.registrationNumber?.ifBlank { null } ?: "—"}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
            IconButton(onClick = onOpenChecklist) {
                Icon(Icons.AutoMirrored.Filled.List, contentDescription = "Open checklist")
            }
            IconButton(
                onClick = { showDeleteDialog = true },
                modifier = Modifier.padding(end = 8.dp),
            ) {
                Icon(Icons.Filled.Delete, contentDescription = "Delete inspection", tint = MaterialTheme.colorScheme.error)
            }
        }
    }

    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Delete inspection?") },
            text = { Text("This permanently removes the inspection, its photos, and checklist data. This cannot be undone.") },
            confirmButton = {
                TextButton(onClick = {
                    showDeleteDialog = false
                    onDelete()
                }) { Text("Delete") }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) { Text("Cancel") }
            },
        )
    }
}

/** Midnight (local) epoch millis for the day containing [millis] — used to group rows by added date. */
private fun startOfDayMillis(millis: Long): Long {
    val cal = Calendar.getInstance()
    cal.timeInMillis = millis
    cal.set(Calendar.HOUR_OF_DAY, 0)
    cal.set(Calendar.MINUTE, 0)
    cal.set(Calendar.SECOND, 0)
    cal.set(Calendar.MILLISECOND, 0)
    return cal.timeInMillis
}

private val headerDateFormat = SimpleDateFormat("d MMM yyyy", Locale.getDefault())

private fun dateHeaderLabel(dayMillis: Long): String {
    val today = startOfDayMillis(System.currentTimeMillis())
    val oneDayMillis = 24L * 60L * 60L * 1000L
    return when (today - dayMillis) {
        0L -> "Today"
        oneDayMillis -> "Yesterday"
        else -> headerDateFormat.format(Date(dayMillis))
    }
}
