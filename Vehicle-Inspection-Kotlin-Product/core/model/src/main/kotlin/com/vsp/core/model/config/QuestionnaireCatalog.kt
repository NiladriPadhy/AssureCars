package com.vsp.core.model.config

import com.vsp.core.model.catalog.Applicability
import com.vsp.core.model.catalog.ChecklistGroup
import com.vsp.core.model.catalog.ChecklistItem
import com.vsp.core.model.catalog.ChecklistResponseType
import com.vsp.core.model.catalog.ChecklistSection

/**
 * Adapts the Firebase-backed [QuestionnaireConfig] into the catalog UI models used by the checklist
 * screens and the report generator. Runtime code reads the active questionnaire from the local cache
 * (populated from Firebase) so vendor edits reflect in the UI and reports without an app redeploy.
 *
 * String-typed config fields (`responseType`, `appliesTo`) are mapped to the domain enums, tolerating
 * unknown values so a server-side addition never crashes rendering.
 */
object QuestionnaireCatalog {

    /** Item id whose stored text value holds a [com.vsp.core.model.RepairRecommendation] name. */
    const val RECOMMENDATION_ITEM_ID = "fa_recommendation"

    /** Sections applicable to [applies], with empty groups/sections pruned and everything ordered. */
    fun sections(config: QuestionnaireConfig, applies: Applicability): List<ChecklistSection> =
        config.sections
            .filter { it.appliesTo.toApplicability().matches(applies) }
            .sortedBy { it.order }
            .map { it.toChecklistSection(applies) }
            .filter { it.groups.isNotEmpty() }

    /** All sections mapped without applicability filtering (for lookups spanning any item). */
    fun allSections(config: QuestionnaireConfig): List<ChecklistSection> =
        config.sections.sortedBy { it.order }.map { it.toChecklistSection(null) }

    fun section(config: QuestionnaireConfig, sectionId: String, applies: Applicability): ChecklistSection? =
        sections(config, applies).firstOrNull { it.id == sectionId }

    fun item(config: QuestionnaireConfig, itemId: String): ChecklistItem? =
        allSections(config).firstNotNullOfOrNull { s -> s.allItems.firstOrNull { it.id == itemId } }

    fun sectionForItem(config: QuestionnaireConfig, itemId: String): ChecklistSection? =
        allSections(config).firstOrNull { s -> s.allItems.any { it.id == itemId } }

    fun groupForItem(config: QuestionnaireConfig, itemId: String): ChecklistGroup? =
        allSections(config).firstNotNullOfOrNull { s -> s.groups.firstOrNull { g -> g.items.any { it.id == itemId } } }

    /** Global ordering of every item id (section order, then item order) — for report image sorting. */
    fun itemOrder(config: QuestionnaireConfig): Map<String, Int> = buildMap {
        var index = 0
        allSections(config).forEach { s -> s.allItems.forEach { put(it.id, index++) } }
    }

    /** Per-item maximum photo count, for items that allow photo evidence. */
    fun maxImagesById(config: QuestionnaireConfig): Map<String, Int> =
        config.sections.asSequence()
            .flatMap { it.groups.asSequence() }
            .flatMap { it.items.asSequence() }
            .filter { it.allowImage }
            .associate { it.id to it.maxImages }

    /** Per-item maximum video count, for items that allow video evidence. */
    fun maxVideosById(config: QuestionnaireConfig): Map<String, Int> =
        config.sections.asSequence()
            .flatMap { it.groups.asSequence() }
            .flatMap { it.items.asSequence() }
            .filter { it.allowVideo }
            .associate { it.id to it.maxVideos }

    private fun ConfigSection.toChecklistSection(applies: Applicability?): ChecklistSection =
        ChecklistSection(
            id = id,
            title = title,
            order = order,
            appliesTo = appliesTo.toApplicability(),
            groups = groups
                .sortedBy { it.order }
                .map { group ->
                    ChecklistGroup(
                        id = group.id,
                        title = group.title,
                        items = group.items
                            .filter { applies == null || it.appliesTo.toApplicability().matches(applies) }
                            .sortedBy { it.order }
                            .map { it.toChecklistItem() },
                    )
                }
                .filter { it.items.isNotEmpty() },
        )

    private fun ConfigItem.toChecklistItem(): ChecklistItem = ChecklistItem(
        id = id,
        label = label,
        responseType = responseType.toResponseType(),
        appliesTo = appliesTo.toApplicability(),
        unit = unit,
        mandatory = mandatory,
        photoCapable = allowImage,
        videoCapable = allowVideo,
    )

    private fun String.toApplicability(): Applicability =
        runCatching { Applicability.valueOf(uppercase()) }.getOrDefault(Applicability.BOTH)

    private fun String.toResponseType(): ChecklistResponseType =
        runCatching { ChecklistResponseType.valueOf(uppercase()) }.getOrDefault(ChecklistResponseType.TEXT)

    private fun Applicability.matches(target: Applicability): Boolean =
        this == Applicability.BOTH || this == target
}
