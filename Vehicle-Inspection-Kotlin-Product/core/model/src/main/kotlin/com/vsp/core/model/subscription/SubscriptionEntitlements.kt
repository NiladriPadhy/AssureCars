package com.vsp.core.model.subscription

/**
 * Feature entitlements per tier. Free is limited to the Documents Verification and Exterior
 * Inspection checklist sections; every other section requires Pro. Pro unlocks everything.
 */
object SubscriptionEntitlements {
    /** Checklist section ids available on the Free tier. */
    val FREE_SECTION_IDS: Set<String> = setOf("documents", "exterior")

    /** Whether a checklist section is usable for the given [tier]. */
    fun isSectionAllowed(tier: SubscriptionTier, sectionId: String): Boolean =
        tier == SubscriptionTier.PRO || sectionId in FREE_SECTION_IDS
}
