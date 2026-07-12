package com.vsp.core.datastore

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.vsp.core.model.subscription.Subscription
import com.vsp.core.model.subscription.SubscriptionTier
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.subscriptionDataStore by preferencesDataStore(name = "vsp_subscription")

/** Persists the last-known subscription so gating survives restarts and works offline. */
@Singleton
class SubscriptionStore @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private object Keys {
        val orgId = stringPreferencesKey("org_id")
        val orgName = stringPreferencesKey("org_name")
        val tier = stringPreferencesKey("tier")
        val hasExpiry = booleanPreferencesKey("has_expiry")
        val expiry = longPreferencesKey("expiry")
        val lastChecked = longPreferencesKey("last_checked")
    }

    val subscription: Flow<Subscription?> = context.subscriptionDataStore.data.map { prefs ->
        val tierName = prefs[Keys.tier] ?: return@map null
        val tier = runCatching { SubscriptionTier.valueOf(tierName) }.getOrDefault(SubscriptionTier.FREE)
        Subscription(
            orgId = prefs[Keys.orgId].orEmpty(),
            orgName = prefs[Keys.orgName].orEmpty(),
            tier = tier,
            expiryDateMillis = if (prefs[Keys.hasExpiry] == true) prefs[Keys.expiry] else null,
            lastCheckedAtMillis = prefs[Keys.lastChecked] ?: 0L,
        )
    }

    suspend fun save(subscription: Subscription) {
        context.subscriptionDataStore.edit { prefs ->
            prefs[Keys.orgId] = subscription.orgId
            prefs[Keys.orgName] = subscription.orgName
            prefs[Keys.tier] = subscription.tier.name
            val expiry = subscription.expiryDateMillis
            if (expiry != null) {
                prefs[Keys.hasExpiry] = true
                prefs[Keys.expiry] = expiry
            } else {
                prefs[Keys.hasExpiry] = false
                prefs.remove(Keys.expiry)
            }
            prefs[Keys.lastChecked] = subscription.lastCheckedAtMillis
        }
    }

    suspend fun clear() {
        context.subscriptionDataStore.edit { it.clear() }
    }
}
