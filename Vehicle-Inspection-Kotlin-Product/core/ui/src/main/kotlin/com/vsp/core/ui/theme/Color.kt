package com.vsp.core.ui.theme

import androidx.compose.ui.graphics.Color

/**
 * Brand palette: a refined indigo / blue-violet primary with a teal accent (tertiary). Kept as a
 * fixed palette (dynamic color off by default) so the product looks consistent on every device.
 * Semantic success/warning tones live here too so screens stop hard-coding hex values.
 */

// ---- Light ----------------------------------------------------------------
internal val LightPrimary = Color(0xFF4A50D6)
internal val LightOnPrimary = Color(0xFFFFFFFF)
internal val LightPrimaryContainer = Color(0xFFE1E0FF)
internal val LightOnPrimaryContainer = Color(0xFF07084F)

internal val LightSecondary = Color(0xFF5A5C72)
internal val LightOnSecondary = Color(0xFFFFFFFF)
internal val LightSecondaryContainer = Color(0xFFDFE0F9)
internal val LightOnSecondaryContainer = Color(0xFF171A2C)

internal val LightTertiary = Color(0xFF00807B)
internal val LightOnTertiary = Color(0xFFFFFFFF)
internal val LightTertiaryContainer = Color(0xFF9EF2EA)
internal val LightOnTertiaryContainer = Color(0xFF00201E)

internal val LightError = Color(0xFFBA1A1A)
internal val LightOnError = Color(0xFFFFFFFF)
internal val LightErrorContainer = Color(0xFFFFDAD6)
internal val LightOnErrorContainer = Color(0xFF410002)

internal val LightBackground = Color(0xFFFBFAFF)
internal val LightOnBackground = Color(0xFF1B1B21)
internal val LightSurface = Color(0xFFFBFAFF)
internal val LightOnSurface = Color(0xFF1B1B21)
internal val LightSurfaceVariant = Color(0xFFE3E1EC)
internal val LightOnSurfaceVariant = Color(0xFF46464F)
internal val LightOutline = Color(0xFF767680)
internal val LightOutlineVariant = Color(0xFFC7C5D0)
internal val LightSurfaceContainer = Color(0xFFF1EFF9)
internal val LightSurfaceContainerHigh = Color(0xFFEBE9F3)
internal val LightInverseSurface = Color(0xFF303036)
internal val LightInverseOnSurface = Color(0xFFF2EFF7)

// ---- Dark -----------------------------------------------------------------
internal val DarkPrimary = Color(0xFFBFC2FF)
internal val DarkOnPrimary = Color(0xFF11148B)
internal val DarkPrimaryContainer = Color(0xFF3135BD)
internal val DarkOnPrimaryContainer = Color(0xFFE1E0FF)

internal val DarkSecondary = Color(0xFFC3C4DD)
internal val DarkOnSecondary = Color(0xFF2C2E42)
internal val DarkSecondaryContainer = Color(0xFF424459)
internal val DarkOnSecondaryContainer = Color(0xFFDFE0F9)

internal val DarkTertiary = Color(0xFF83D5CD)
internal val DarkOnTertiary = Color(0xFF003734)
internal val DarkTertiaryContainer = Color(0xFF00504B)
internal val DarkOnTertiaryContainer = Color(0xFF9EF2EA)

internal val DarkError = Color(0xFFFFB4AB)
internal val DarkOnError = Color(0xFF690005)
internal val DarkErrorContainer = Color(0xFF93000A)
internal val DarkOnErrorContainer = Color(0xFFFFDAD6)

internal val DarkBackground = Color(0xFF121318)
internal val DarkOnBackground = Color(0xFFE4E1E9)
internal val DarkSurface = Color(0xFF121318)
internal val DarkOnSurface = Color(0xFFE4E1E9)
internal val DarkSurfaceVariant = Color(0xFF46464F)
internal val DarkOnSurfaceVariant = Color(0xFFC7C5D0)
internal val DarkOutline = Color(0xFF918F9A)
internal val DarkOutlineVariant = Color(0xFF46464F)
internal val DarkSurfaceContainer = Color(0xFF1E1F25)
internal val DarkSurfaceContainerHigh = Color(0xFF292A30)
internal val DarkInverseSurface = Color(0xFFE4E1E9)
internal val DarkInverseOnSurface = Color(0xFF303036)

/**
 * Semantic accents that aren't part of the standard Material role set. Use via
 * [com.vsp.core.ui.theme.VspAccents] / MaterialTheme extensions rather than hard-coding hex.
 */
val SuccessLight = Color(0xFF2E7D32)
val SuccessDark = Color(0xFF7FDB84)
val WarningLight = Color(0xFFB26A00)
val WarningDark = Color(0xFFFFB868)
