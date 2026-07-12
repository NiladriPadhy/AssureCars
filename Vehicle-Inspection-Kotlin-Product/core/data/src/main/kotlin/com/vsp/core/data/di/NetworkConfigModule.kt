package com.vsp.core.data.di

import com.vsp.core.data.remote.subscription.SubscriptionConfig
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/** Default remote API configuration for the inspection app (no login/subscription endpoints). */
@Module
@InstallIn(SingletonComponent::class)
object NetworkConfigModule {

    @Provides
    @Singleton
    fun provideSubscriptionConfig(): SubscriptionConfig = SubscriptionConfig(baseUrl = "")
}
