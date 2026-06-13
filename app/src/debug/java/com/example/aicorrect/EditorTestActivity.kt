package com.example.aicorrect

import android.app.Activity
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.view.WindowManager
import android.widget.EditText

/**
 * Activité minimale présente uniquement dans la variante **debug** de l'app
 * (pas en release). Elle présente un champ de saisie focalisé : quand le clavier
 * AiCorrect est l'IME par défaut, l'ouvrir suffit à afficher le clavier et donc
 * le bouton « Corriger ».
 *
 * Volontairement dans le source set `debug` (et non `androidTest`) : ainsi elle
 * appartient au package de l'app `com.example.aicorrect` et tourne dans le même
 * process que l'instrumentation — sinon ActivityScenario échoue avec
 * « resolved to different process com.example.aicorrect.test ».
 *
 * Aucune dépendance aux ressources de l'app : vue construite en code, thème du
 * framework.
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
