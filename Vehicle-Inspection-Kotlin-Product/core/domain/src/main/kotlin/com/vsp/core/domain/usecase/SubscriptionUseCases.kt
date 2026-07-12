package com.vsp.core.domain.usecase

import com.vsp.core.domain.repository.SubscriptionRepository
import com.vsp.core.model.AppResult
import com.vsp.core.model.subscription.Subscription
import com.vsp.core.model.subscription.SubscriptionTier
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

/** Observes the cached subscription for the signed-in user (Free when none). */
class ObserveSubscriptionUseCase @Inject constructor(
    private val repository: SubscriptionRepository,
) {
    operator fun invoke(): Flow<Subscription> = repository.subscription
}

/** Fetches and caches the latest subscription for organisation [orgId] (login / app-start / periodic refresh). */
class RefreshSubscriptionUseCase @Inject constructor(
    private val repository: SubscriptionRepository,
) {
    suspend operator fun invoke(orgId: String): Subscription = repository.refresh(orgId)
}

/**
 * Refreshes the cached subscription when it is older than [DEFAULT_MAX_AGE_MS] (30 minutes). Called
 * when the inspection checklist screen opens; keeps the existing cache when offline/unreachable.
 */
class RefreshSubscriptionIfStaleUseCase @Inject constructor(
    private val repository: SubscriptionRepository,
) {
    suspend operator fun invoke(maxAgeMillis: Long = DEFAULT_MAX_AGE_MS): Subscription =
        repository.refreshIfStale(maxAgeMillis)

    companion object {
        /** 30 minutes. */
        const val DEFAULT_MAX_AGE_MS: Long = 30L * 60L * 1000L
    }
}

/** One-off lookup for an organisation (admin subscription screen). */
class LookupSubscriptionUseCase @Inject constructor(
    private val repository: SubscriptionRepository,
) {
    suspend operator fun invoke(orgId: String): AppResult<Subscription> = repository.lookup(orgId)
}

/** Clears the cached subscription (sign-out). */
class ClearSubscriptionUseCase @Inject constructor(
    private val repository: SubscriptionRepository,
) {
    suspend operator fun invoke() = repository.clear()
}

/** Admin: sets (upsert) the subscription tier + expiry for an organisation. */
class SetSubscriptionUseCase @Inject constructor(
    private val repository: SubscriptionRepository,
) {
    suspend operator fun invoke(
        orgId: String,
        tier: SubscriptionTier,
        expiryMillis: Long?,
    ): AppResult<Subscription> = repository.setSubscription(orgId.trim(), tier, expiryMillis)
}

/** Admin: deletes the subscription for an organisation (reverts to Free). */
class DeleteSubscriptionUseCase @Inject constructor(
    private val repository: SubscriptionRepository,
) {
    suspend operator fun invoke(orgId: String): AppResult<Unit> = repository.deleteSubscription(orgId.trim())
}
