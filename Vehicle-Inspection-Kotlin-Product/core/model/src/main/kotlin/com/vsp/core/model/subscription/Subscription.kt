package com.vsp.core.model.subscription

import kotlinx.serialization.Serializable

/** Subscription tier. Free is the default; Pro unlocks all sections and clean (unwatermarked) PDFs. */
enum class SubscriptionTier { FREE, PRO }

/**
 * A user's subscription as known to the app. Stored raw (the server-reported [tier] and
 * [expiryDateMillis]); the *effective* tier is computed locally via [effectiveTier] so the app
 * downgrades to Free the moment an expiry passes, even while offline.
 */
@Serializable
data class Subscription(
    /** The organisation this subscription belongs to (the subscription is org-scoped). */
    val orgId: String = "",
    /** Human-readable organisation name, as reported by the API. */
    val orgName: String = "",
    val tier: SubscriptionTier = SubscriptionTier.FREE,
    /** Epoch millis; `null` = Lifetime (for PRO) or not-applicable (FREE). */
    val expiryDateMillis: Long? = null,
    /** When the app last refreshed this record from the API (epoch millis). */
    val lastCheckedAtMillis: Long = 0L,
) {
    /** The tier after applying expiry at [now]: an expired PRO is treated as FREE. */
    fun effectiveTier(now: Long = System.currentTimeMillis()): SubscriptionTier =
        if (tier == SubscriptionTier.PRO && (expiryDateMillis == null || expiryDateMillis > now)) {
            SubscriptionTier.PRO
        } else {
            SubscriptionTier.FREE
        }

    /** True for a PRO subscription with no expiry. */
    val isLifetime: Boolean get() = tier == SubscriptionTier.PRO && expiryDateMillis == null

    /** True when this is a PRO record whose expiry has already passed. */
    fun isExpired(now: Long = System.currentTimeMillis()): Boolean =
        tier == SubscriptionTier.PRO && expiryDateMillis != null && expiryDateMillis <= now

    companion object {
        fun free(orgId: String = "", orgName: String = ""): Subscription =
            Subscription(orgId = orgId, orgName = orgName, tier = SubscriptionTier.FREE)
    }
}
