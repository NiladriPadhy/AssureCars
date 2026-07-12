package com.vsp.core.data.sync

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import dagger.hilt.android.qualifiers.ApplicationContext
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Schedules subscription refreshes: a ~30-minute periodic check plus an immediate one-off used at
 * login / app-start. Both require connectivity and coalesce duplicates.
 */
@Singleton
class SubscriptionScheduler @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val networkConstraints =
        Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()

    /** Enqueues the recurring 30-minute refresh (kept across restarts). */
    fun schedulePeriodic() {
        val request = PeriodicWorkRequestBuilder<SubscriptionRefreshWorker>(30, TimeUnit.MINUTES)
            .setConstraints(networkConstraints)
            .build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            SubscriptionRefreshWorker.UNIQUE_PERIODIC_NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            request,
        )
    }

    /** Enqueues an immediate one-off refresh (e.g. right after login). */
    fun refreshNow() {
        val request = OneTimeWorkRequestBuilder<SubscriptionRefreshWorker>()
            .setConstraints(networkConstraints)
            .build()
        WorkManager.getInstance(context).enqueueUniqueWork(
            SubscriptionRefreshWorker.UNIQUE_ONE_TIME_NAME,
            ExistingWorkPolicy.REPLACE,
            request,
        )
    }

    fun cancel() {
        WorkManager.getInstance(context).cancelUniqueWork(SubscriptionRefreshWorker.UNIQUE_PERIODIC_NAME)
    }
}
