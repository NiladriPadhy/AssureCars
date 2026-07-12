package com.assurecars.vehicleinspection.di

import com.vsp.core.data.remote.rtdb.FirebaseConfig
import com.assurecars.vehicleinspection.BuildConfig
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Supplies the per-vendor Firebase Realtime Database configuration from BuildConfig (backed by
 * local.properties). When the URL is blank the app runs in offline baseline mode: RTDB is disabled
 * and the bundled baseline questionnaire is used.
 */
@Module
@InstallIn(SingletonComponent::class)
object FirebaseModule {

    @Provides
    @Singleton
    fun provideFirebaseConfig(): FirebaseConfig = FirebaseConfig.of(
        databaseUrl = BuildConfig.FIREBASE_DB_URL,
        projectId = BuildConfig.FIREBASE_PROJECT_ID,
        applicationId = BuildConfig.FIREBASE_APP_ID,
        apiKey = BuildConfig.FIREBASE_API_KEY,
    )
}
