package com.example.aicorrect

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
}
