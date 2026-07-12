package com.vsp.core.model.organization

/** A tenant organisation that owns a subscription and a set of member users. */
data class Organization(
    val id: String,
    val name: String,
)

/** A member user of an organisation (as listed by the admin app). */
data class OrgUser(
    val uid: String,
    val displayName: String,
    val email: String,
)
