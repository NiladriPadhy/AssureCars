package com.vsp.core.data.repository

import android.util.Log
import com.vsp.core.data.local.dao.InspectorDao
import com.vsp.core.data.mapper.toEntity
import com.vsp.core.data.remote.auth.LoginApi
import com.vsp.core.data.remote.auth.RemoteSession
import com.vsp.core.datastore.SessionStore
import com.vsp.core.domain.coroutine.DispatcherProvider
import com.vsp.core.domain.repository.AuthRepository
import com.vsp.core.model.AppResult
import com.vsp.core.model.Inspector
import com.vsp.core.model.Session
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Authentication backed by the server-side `login` Cloud Function. Credentials are verified in the
 * backend (not on-device); on success the returned profile — including the user's organisation — is
 * persisted as a [Session] so the app opens straight to the dashboard offline afterwards.
 *
 * Account creation is an admin-only operation performed through the Admin app / Cloud Functions and
 * is intentionally not exposed here.
 */
@Singleton
class AuthRepositoryImpl @Inject constructor(
    private val sessionStore: SessionStore,
    private val inspectorDao: InspectorDao,
    private val loginApi: LoginApi,
    private val dispatchers: DispatcherProvider,
) : AuthRepository {

    override val session: Flow<Session?> = sessionStore.session

    override suspend fun signIn(email: String, password: String): AppResult<Session> =
        withContext(dispatchers.io) {
            when (val result = loginApi.login(email, password)) {
                is AppResult.Failure -> result
                is AppResult.Success -> persist(result.value)
            }
        }

    override suspend fun signOut(): AppResult<Unit> = withContext(dispatchers.io) {
        sessionStore.clear()
        AppResult.Success(Unit)
    }

    override fun hasValidOfflineSession(): Boolean =
        runCatching { runBlocking { sessionStore.session.first() != null } }.getOrDefault(false)

    private suspend fun persist(remote: RemoteSession): AppResult<Session> {
        val now = System.currentTimeMillis()
        Log.i(TAG, "login OK uid=${remote.uid} org=${remote.orgId}")
        // Ensure an Inspector row exists so inspections can reference this user id locally.
        inspectorDao.upsert(Inspector(remote.uid, remote.displayName, remote.email).toEntity())
        val session = Session(
            inspectorId = remote.uid,
            displayName = remote.displayName,
            email = remote.email,
            orgId = remote.orgId,
            orgName = remote.orgName,
            issuedAtMillis = now,
        )
        sessionStore.save(session)
        return AppResult.Success(session)
    }

    private companion object {
        const val TAG = "VspAuth"
    }
}
