package com.vsp.core.ui.theme

import androidx.compose.ui.graphics.Color

/**
 * AssureCars brand palette aligned with [prototype/styles.css] (navy + teal). Kept as a fixed
 * palette (dynamic color off by default) so the Inspection App matches the product prototype on
 * every device. Semantic success / warning / error tones mirror prototype emerald, amber, and rose.
 */

// ---- Prototype tokens (reference) -------------------------------------------
// navy-900 #0a1628, navy-800 #0f2038, teal-500 #0fb5a6, teal-600 #0a9488, teal-050 #e6f7f5
// ink-900 #0d1421, ink-500 #64748b, ink-200 #e2e8f0, ink-050 #f8fafc
// emerald-500 #16a34a, amber-500 #f5a623, rose-500 #e5484d

// ---- Light ----------------------------------------------------------------
internal val LightPrimary = Color(0xFF0FB5A6)
internal val LightOnPrimary = Color(0xFFFFFFFF)
internal val LightPrimaryContainer = Color(0xFFE6F7F5)
internal val LightOnPrimaryContainer = Color(0xFF0A9488)

internal val LightSecondary = Color(0xFF0A1628)
internal val LightOnSecondary = Color(0xFFFFFFFF)
internal val LightSecondaryContainer = Color(0xFFE2E8F0)
internal val LightOnSecondaryContainer = Color(0xFF0D1421)

internal val LightTertiary = Color(0xFF16304F)
internal val LightOnTertiary = Color(0xFFFFFFFF)
internal val LightTertiaryContainer = Color(0xFFF1F5F9)
internal val LightOnTertiaryContainer = Color(0xFF33415C)

internal val LightError = Color(0xFFE5484D)
internal val LightOnError = Color(0xFFFFFFFF)
internal val LightErrorContainer = Color(0xFFFDEAEA)
internal val LightOnErrorContainer = Color(0xFF7F1D1D)

internal val LightBackground = Color(0xFFF8FAFC)
internal val LightOnBackground = Color(0xFF0D1421)
internal val LightSurface = Color(0xFFFFFFFF)
internal val LightOnSurface = Color(0xFF0D1421)
internal val LightSurfaceVariant = Color(0xFFE2E8F0)
internal val LightOnSurfaceVariant = Color(0xFF64748B)
internal val LightOutline = Color(0xFFCBD5E1)
internal val LightOutlineVariant = Color(0xFFE2E8F0)
internal val LightSurfaceContainer = Color(0xFFF1F5F9)
internal val LightSurfaceContainerHigh = Color(0xFFE2E8F0)
internal val LightInverseSurface = Color(0xFF0A1628)
internal val LightInverseOnSurface = Color(0xFFF8FAFC)

// ---- Dark -----------------------------------------------------------------
internal val DarkPrimary = Color(0xFF0FB5A6)
internal val DarkOnPrimary = Color(0xFF003734)
internal val DarkPrimaryContainer = Color(0xFF16304F)
internal val DarkOnPrimaryContainer = Color(0xFFE6F7F5)

internal val DarkSecondary = Color(0xFFCBD5E1)
internal val DarkOnSecondary = Color(0xFF0A1628)
internal val DarkSecondaryContainer = Color(0xFF1E3A5F)
internal val DarkOnSecondaryContainer = Color(0xFFE2E8F0)

internal val DarkTertiary = Color(0xFF94A3B8)
internal val DarkOnTertiary = Color(0xFF0F2038)
internal val DarkTertiaryContainer = Color(0xFF33415C)
internal val DarkOnTertiaryContainer = Color(0xFFF1F5F9)

internal val DarkError = Color(0xFFFFB4AB)
internal val DarkOnError = Color(0xFF690005)
internal val DarkErrorContainer = Color(0xFF93000A)
internal val DarkOnErrorContainer = Color(0xFFFFDAD6)

internal val DarkBackground = Color(0xFF0B1220)
internal val DarkOnBackground = Color(0xFFF1F5F9)
internal val DarkSurface = Color(0xFF0F2038)
internal val DarkOnSurface = Color(0xFFF1F5F9)
internal val DarkSurfaceVariant = Color(0xFF1E3A5F)
internal val DarkOnSurfaceVariant = Color(0xFF94A3B8)
internal val DarkOutline = Color(0xFF33415C)
internal val DarkOutlineVariant = Color(0xFF1E3A5F)
internal val DarkSurfaceContainer = Color(0xFF16304F)
internal val DarkSurfaceContainerHigh = Color(0xFF1E3A5F)
internal val DarkInverseSurface = Color(0xFFF1F5F9)
internal val DarkInverseOnSurface = Color(0xFF0D1421)

/**
 * Semantic accents that aren't part of the standard Material role set. Use via
 * [com.vsp.core.ui.theme.VspAccents] / MaterialTheme extensions rather than hard-coding hex.
 */
val SuccessLight = Color(0xFF16A34A)
val SuccessDark = Color(0xFF4ADE80)
val WarningLight = Color(0xFFF5A623)
val WarningDark = Color(0xFFFFC857)
