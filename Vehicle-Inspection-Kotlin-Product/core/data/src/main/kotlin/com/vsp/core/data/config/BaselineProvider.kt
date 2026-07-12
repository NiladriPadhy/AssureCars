package com.vsp.core.data.config

import android.content.Context
import android.util.Log
import com.vsp.core.model.config.BaselineQuestionnaire
import com.vsp.core.model.config.ConfigHashing
import com.vsp.core.model.config.QuestionnaireConfig
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Supplies the baseline questionnaire for a first-time vendor. Prefers the bundled, editable asset
 * `assets/baseline_questionnaire.json` (so a vendor can customise the seed without recompiling) and
 * falls back to the in-code [BaselineQuestionnaire] derived from the checklist catalog. The content
 * hash is always recomputed so an edited asset stays self-consistent.
 */
@Singleton
class BaselineProvider @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    fun questionnaire(): QuestionnaireConfig {
        val fromAsset = runCatching {
            context.assets.open(ASSET_NAME).bufferedReader().use { it.readText() }
                .let { json.decodeFromString<QuestionnaireConfig>(it) }
                .let { it.copy(hash = ConfigHashing.hash(it)) }
        }.onFailure { Log.w(TAG, "Failed to load bundled $ASSET_NAME; falling back to in-code baseline", it) }
            .getOrNull()
        return if (fromAsset != null) {
            Log.i(TAG, "Baseline seed loaded from asset $ASSET_NAME v${fromAsset.version} (${fromAsset.itemIds.size} items)")
            fromAsset
        } else {
            BaselineQuestionnaire.build().also { Log.i(TAG, "Baseline seed built in-code v${it.version} (${it.itemIds.size} items)") }
        }
    }

    companion object {
        private const val TAG = "VspBaseline"
        private const val ASSET_NAME = "baseline_questionnaire.json"
    }
}
