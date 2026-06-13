package com.example.aicorrect

import android.app.Activity
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.view.WindowManager
import android.widget.EditText

/**
 * Activité minimale (uniquement compilée dans l'APK de test) qui présente un
 * champ de saisie focalisé. Quand le clavier AiCorrect est l'IME par défaut,
 * l'ouvrir suffit à afficher le clavier et donc le bouton « Corriger ».
 *
 * On ne dépend d'aucune ressource de l'app : la vue est construite en code et
 * le thème vient du framework, pour rester indépendant du package de l'app.
 */
class EditorTestActivity : Activity() {

    private lateinit var editor: EditText

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_VISIBLE)

        editor = EditText(this).apply {
            inputType = InputType.TYPE_CLASS_TEXT or
                InputType.TYPE_TEXT_FLAG_MULTI_LINE or
                InputType.TYPE_TEXT_FLAG_CAP_SENTENCES
            gravity = Gravity.TOP or Gravity.START
        }
        setContentView(editor)
        editor.requestFocus()
    }

    /** Pré-remplit le champ et place le curseur en fin de texte. */
    fun setText(value: String) {
        editor.setText(value)
        editor.setSelection(value.length)
        editor.requestFocus()
    }

    fun currentText(): String = editor.text?.toString().orEmpty()
}
