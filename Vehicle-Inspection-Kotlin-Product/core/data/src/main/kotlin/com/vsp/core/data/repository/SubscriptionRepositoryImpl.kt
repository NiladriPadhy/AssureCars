package com.vsp.core.data.repository

import android.util.Log
import com.vsp.core.data.remote.subscription.SubscriptionApi
import com.vsp.core.datastore.SubscriptionStore
import com.vsp.core.domain.coroutine.DispatcherProvider
import com.vsp.core.domain.repository.SubscriptionRepository
import com.vsp.core.model.AppError
import com.vsp.core.model.AppResult
import com.vsp.core.model.subscription.Subscription
import com.vsp.core.model.subscription.SubscriptionTier
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SubscriptionRepositoryImpl @Inject constructor(
    private val api: SubscriptionApi,
    private val store: SubscriptionStore,
    private val dispatchers: DispatcherProvider,
) : SubscriptionRepository {

    /**
     * When the app last *attempted* a subscription refresh (success or failure), for the checklist
     * screen's staleness throttle. A failed fetch still advances this so we don't retry on every
     * screen open — we wait for the next interval. In-memory (singleton-scoped).
     */
    @Volatile private var lastRefreshAttemptAt: Long = 0L

    override val subscription: Flow<Subscription> =
        store.subscription.map { it ?: Subscription.free() }

    override suspend fun refresh(orgId: String): Subscription = withContext(dispatchers.io) {
        lastRefreshAttemptAt = System.currentTimeMillis()
        Log.i(TAG, "refresh: requesting subscription for org=$orgId")
        val fetched = api.getSubscription(orgId)
        if (fetched != null) {
            store.save(fetched)
            Log.i(TAG, "refresh: saved org=${fetched.orgId} tier=${fetched.tier} effective=${fetched.effectiveTier()} expiry=${fetched.expiryDateMillis}")
            fetched
        } else {
            // API unreachable/unconfigured: keep the last cached value (Free if none).
            val cached = store.subscription.first() ?: Subscription.free(orgId)
            Log.w(TAG, "refresh: API returned null for org=$orgId — keeping cached tier=${cached.tier} effective=${cached.effectiveTier()}")
            cached
        }
    }

    override suspend fun refreshIfStale(maxAgeMillis: Long): Subscription = withContext(dispatchers.io) {
        val current = store.subscription.first() ?: Subscription.free()
        val sinceAttempt = System.currentTimeMillis() - lastRefreshAttemptAt
        if (sinceAttempt < maxAgeMillis) {
            // Attempted within the window (success or failure): skip to the next interval. Never
            // blocks, never errors — just serves the current cache.
            Log.d(TAG, "refreshIfStale: attempted ${sinceAttempt}ms ago (< ${maxAgeMillis}ms) — skipping")
            return@withContext current
        }
        val orgId = current.orgId
        if (orgId.isBlank()) {
            Log.d(TAG, "refreshIfStale: no cached organisation — keeping current")
            return@withContext current
        }
        Log.i(TAG, "refreshIfStale: last attempt ${sinceAttempt}ms ago — refreshing org=$orgId")
        refresh(orgId)
    }

    override suspend fun lookup(orgId: String): AppResult<Subscription> = withContext(dispatchers.io) {
        if (orgId.isBlank()) {
            return@withContext AppResult.Failure(AppError.Validation("An organisation is required"))
        }
        when (val fetched = api.getSubscription(orgId)) {
            null -> AppResult.Failure(AppError.Network())
            else -> AppResult.Success(fetched)
        }
    }

    override suspend fun setSubscription(
        orgId: String,
        tier: SubscriptionTier,
        expiryMillis: Long?,
    ): AppResult<Subscription> = withContext(dispatchers.io) {
        if (orgId.isBlank()) {
            return@withContext AppResult.Failure(AppError.Validation("An organisation is required"))
        }
        // FREE never carries an expiry; PRO may be null (Lifetime).
        val expiry = if (tier == SubscriptionTier.PRO) expiryMillis else null
        when (val updated = api.updateSubscription(orgId, tier.name, expiry)) {
            null -> AppResult.Failure(AppError.Network())
            else -> AppResult.Success(updated)
        }
    }

    override suspend fun deleteSubscription(orgId: String): AppResult<Unit> = withContext(dispatchers.io) {
        if (orgId.isBlank()) {
            return@withContext AppResult.Failure(AppError.Validation("An organisation is required"))
        }
        if (api.deleteSubscription(orgId)) AppResult.Success(Unit) else AppResult.Failure(AppError.Network())
    }

    override suspend fun clear() = withContext(dispatchers.io) {
        store.clear()
    }

    private companion object {
        const val TAG = "VspSubscription"
    }
}
