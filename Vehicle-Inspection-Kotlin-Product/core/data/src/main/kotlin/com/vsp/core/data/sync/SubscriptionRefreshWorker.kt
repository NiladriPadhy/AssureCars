package com.vsp.core.data.sync

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.vsp.core.data.remote.subscription.SubscriptionApi
import com.vsp.core.datastore.SessionStore
import com.vsp.core.datastore.SubscriptionStore
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import kotlinx.coroutines.flow.first

/**
 * Periodically refreshes the signed-in user's subscription from the API so tier/expiry stay current
 * (checked ~every 30 minutes, and on login/app-start). No-op when signed out. Expiry is additionally
 * evaluated locally on read, so downgrades happen even without a successful refresh.
 */
@HiltWorker
class SubscriptionRefreshWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted params: WorkerParameters,
    private val sessionStore: SessionStore,
    private val subscriptionStore: SubscriptionStore,
    private val api: SubscriptionApi,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val orgId = sessionStore.session.first()?.orgId
        if (orgId.isNullOrBlank()) return Result.success()
        val fetched = api.getSubscription(orgId) ?: return Result.retry()
        subscriptionStore.save(fetched)
        return Result.success()
    }

    companion object {
        const val UNIQUE_PERIODIC_NAME = "vsp-subscription-refresh"
        const val UNIQUE_ONE_TIME_NAME = "vsp-subscription-refresh-now"
    }
}
