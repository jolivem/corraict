package com.aicorrect.plume

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.view.inputmethod.InputMethodManager

/**
 * Raccourcis pour activer le clavier Plume sans avoir à fouiller les réglages :
 *  - [openImeSettings] ouvre l'écran système « Claviers à l'écran » où l'on
 *    coche Plume pour l'autoriser.
 *  - [showImePicker] affiche le sélecteur « Choisir le clavier » pour définir
 *    Plume comme clavier actif.
 */
object KeyboardSetup {

    fun openImeSettings(context: Context) {
        try {
            context.startActivity(Intent(Settings.ACTION_INPUT_METHOD_SETTINGS))
        } catch (_: Throwable) {
            // Écran indisponible sur ce ROM : on tente les réglages généraux.
            try {
                context.startActivity(Intent(Settings.ACTION_SETTINGS))
            } catch (_: Throwable) {
            }
        }
    }

    fun showImePicker(context: Context) {
        val imm = context.getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
        imm?.showInputMethodPicker()
    }

    /** Id du service Plume tel que stocké par le système : forme COURTE
     *  (`pkg/.Classe`), identique à `InputMethodInfo.id` et à
     *  `Settings.Secure.DEFAULT_INPUT_METHOD`. Ne pas utiliser `flattenToString()`
     *  (forme longue) : la comparaison échouerait. */
    private fun imeId(context: Context): String =
        ComponentName(context, CorrectKeyboardService::class.java).flattenToShortString()

    /** Plume est-il autorisé dans la liste des claviers (étape « Activer ») ? */
    fun isImeEnabled(context: Context): Boolean {
        val imm = context.getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
            ?: return false
        val id = imeId(context)
        return imm.enabledInputMethodList.any { it.id == id }
    }

    /** Plume est-il le clavier actif par défaut (étape « Choisir ») ? */
    fun isImeSelected(context: Context): Boolean {
        val current = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.DEFAULT_INPUT_METHOD,
        )
        return current == imeId(context)
    }
}
