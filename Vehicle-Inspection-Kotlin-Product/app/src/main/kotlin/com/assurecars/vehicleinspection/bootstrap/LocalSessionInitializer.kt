package com.assurecars.vehicleinspection.bootstrap

import com.vsp.core.data.local.dao.InspectorDao
import com.vsp.core.data.mapper.toEntity
import com.vsp.core.datastore.SessionStore
import com.vsp.core.domain.coroutine.DispatcherProvider
import com.vsp.core.model.Inspector
import com.vsp.core.model.Session
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

/** Ensures a default local inspector session exists so the app can run without login. */
@Singleton
class LocalSessionInitializer @Inject constructor(
    private val sessionStore: SessionStore,
    private val inspectorDao: InspectorDao,
    private val dispatchers: DispatcherProvider,
) {
    suspend fun ensure() = withContext(dispatchers.io) {
        if (sessionStore.session.first() != null) return@withContext
        val now = System.currentTimeMillis()
        val inspector = Inspector(
            id = DEFAULT_INSPECTOR_ID,
            displayName = DEFAULT_DISPLAY_NAME,
            email = "",
        )
        inspectorDao.upsert(inspector.toEntity())
        sessionStore.save(
            Session(
                inspectorId = inspector.id,
                displayName = inspector.displayName,
                email = inspector.email,
                issuedAtMillis = now,
            ),
        )
    }

    companion object {
        const val DEFAULT_INSPECTOR_ID = "local-inspector"
        const val DEFAULT_DISPLAY_NAME = "Inspector"
    }
}
