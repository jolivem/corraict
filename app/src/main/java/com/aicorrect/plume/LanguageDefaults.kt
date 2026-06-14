package com.aicorrect.plume

import java.util.Locale

/**
 * Langue par défaut du correcteur, déduite de la langue du téléphone : français
 * si l'appareil est configuré en français, anglais sinon. Sert de valeur de repli
 * tant que l'utilisateur n'a pas choisi explicitement une langue dans les réglages.
 *
 * Le correcteur ne propose que "fr" et "en" : toute locale non française retombe
 * donc sur l'anglais.
 */
fun deviceDefaultLanguage(): String =
    if (Locale.getDefault().language == "fr") "fr" else "en"
