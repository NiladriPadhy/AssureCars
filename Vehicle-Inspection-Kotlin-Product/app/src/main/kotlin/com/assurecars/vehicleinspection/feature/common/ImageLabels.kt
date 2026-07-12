package com.assurecars.vehicleinspection.feature.common

import com.vsp.core.model.InspectionImage
import com.vsp.core.model.Section
import com.vsp.core.model.catalog.DocumentCatalog
import com.vsp.core.model.catalog.PositionCatalog
import com.vsp.core.model.config.QuestionnaireCatalog
import com.vsp.core.model.config.QuestionnaireConfig

/**
 * Human-readable path label for an inspection image. For checklist-tagged photos this is the
 * full "Section -> Group -> Item" path, e.g. "Exterior Inspection -> Front -> Front Bumper".
 * Falls back to "Section -> Position" for legacy wizard/document captures.
 */
fun InspectionImage.typeLabel(questionnaire: QuestionnaireConfig): String {
    checklistItemId?.let { itemId ->
        val item = QuestionnaireCatalog.item(questionnaire, itemId)
        val section = QuestionnaireCatalog.sectionForItem(questionnaire, itemId)
        if (item != null && section != null) {
            val group = QuestionnaireCatalog.groupForItem(questionnaire, itemId)
            val parts = listOfNotNull(
                section.title,
                group?.title?.takeIf { it != item.label && it != section.title },
                item.label,
            )
            return parts.joinToString(" \u2192 ")
        }
    }

    val sectionLabel = when (section) {
        Section.EXTERIOR -> "Exterior"
        Section.INTERIOR -> "Interior"
        Section.DOCUMENT -> "Document"
    }
    val positionLabel = when (section) {
        Section.DOCUMENT -> DocumentCatalog.oldVehicleDocuments
            .firstOrNull { it.type == documentType }?.displayName
            ?: documentType?.name?.replace('_', ' ')
            ?: position.replace('_', ' ')
        else -> PositionCatalog.forSection(section)
            .firstOrNull { it.id == position }?.displayName
            ?: checklistSectionId?.let { sectionId ->
                QuestionnaireCatalog.allSections(questionnaire).firstOrNull { it.id == sectionId }?.title
            }
            ?: position.substringBefore('_').replace('_', ' ').replaceFirstChar { it.uppercase() }
    }
    return "$sectionLabel \u2192 $positionLabel"
}
