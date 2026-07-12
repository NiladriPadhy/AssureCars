package com.vsp.core.data.repository

import com.vsp.core.data.remote.organization.OrganizationApi
import com.vsp.core.domain.coroutine.DispatcherProvider
import com.vsp.core.domain.repository.OrganizationRepository
import com.vsp.core.model.AppError
import com.vsp.core.model.AppResult
import com.vsp.core.model.organization.OrgUser
import com.vsp.core.model.organization.Organization
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class OrganizationRepositoryImpl @Inject constructor(
    private val api: OrganizationApi,
    private val dispatchers: DispatcherProvider,
) : OrganizationRepository {

    override suspend fun listOrganisations(): AppResult<List<Organization>> =
        withContext(dispatchers.io) { api.listOrganisations() }

    override suspend fun createOrganisation(name: String): AppResult<Organization> = withContext(dispatchers.io) {
        if (name.isBlank()) return@withContext AppResult.Failure(AppError.Validation("Organisation name is required"))
        api.createOrganisation(name)
    }

    override suspend fun updateOrganisation(id: String, name: String): AppResult<Organization> = withContext(dispatchers.io) {
        if (id.isBlank()) return@withContext AppResult.Failure(AppError.Validation("Organisation id is required"))
        if (name.isBlank()) return@withContext AppResult.Failure(AppError.Validation("Organisation name is required"))
        api.updateOrganisation(id, name)
    }

    override suspend fun deleteOrganisation(id: String): AppResult<Unit> = withContext(dispatchers.io) {
        if (id.isBlank()) return@withContext AppResult.Failure(AppError.Validation("Organisation id is required"))
        api.deleteOrganisation(id)
    }

    override suspend fun listUsers(orgId: String): AppResult<List<OrgUser>> = withContext(dispatchers.io) {
        if (orgId.isBlank()) return@withContext AppResult.Failure(AppError.Validation("Organisation id is required"))
        api.listUsers(orgId)
    }

    override suspend fun addUser(
        orgId: String,
        displayName: String,
        email: String,
        password: String,
    ): AppResult<OrgUser> = withContext(dispatchers.io) {
        if (orgId.isBlank()) return@withContext AppResult.Failure(AppError.Validation("Organisation id is required"))
        if (displayName.isBlank()) return@withContext AppResult.Failure(AppError.Validation("Name is required"))
        if (email.isBlank() || !email.contains('@')) {
            return@withContext AppResult.Failure(AppError.Validation("A valid email is required"))
        }
        if (password.length < 6) {
            return@withContext AppResult.Failure(AppError.Validation("Password must be at least 6 characters"))
        }
        api.createUser(orgId, displayName, email, password)
    }

    override suspend fun deleteUser(uid: String): AppResult<Unit> = withContext(dispatchers.io) {
        if (uid.isBlank()) return@withContext AppResult.Failure(AppError.Validation("User id is required"))
        api.deleteUser(uid)
    }
}
