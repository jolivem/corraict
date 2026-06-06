package com.example.aicorrect

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.os.Bundle
import android.view.MenuItem
import android.widget.ArrayAdapter
import android.widget.Spinner
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.button.MaterialButton
import com.google.android.material.switchmaterial.SwitchMaterial
import com.google.android.material.textfield.TextInputEditText

class SettingsActivity : AppCompatActivity() {

    private lateinit var switchAutoCorrect: SwitchMaterial
    private lateinit var switchCompletion: SwitchMaterial
    private lateinit var spinnerLanguage: Spinner
    private lateinit var editServerToken: TextInputEditText
    private lateinit var buttonSave: MaterialButton

    private fun getPreferences(): SharedPreferences {
        val storageContext = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            createDeviceProtectedStorageContext()
        } else {
            this
        }
        return storageContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_settings)

        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = getString(R.string.settings_title)

        switchAutoCorrect = findViewById(R.id.switchAutoCorrect)
        switchCompletion = findViewById(R.id.switchCompletion)
        spinnerLanguage = findViewById(R.id.spinnerLanguage)
        editServerToken = findViewById(R.id.editServerToken)
        buttonSave = findViewById(R.id.buttonSave)

        val languageLabels = listOf(
            getString(R.string.language_french),
            getString(R.string.language_english),
        )
        val languageCodes = listOf("fr", "en")
        val languageAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, languageLabels)
        languageAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        spinnerLanguage.adapter = languageAdapter

        val prefs = getPreferences()
        switchAutoCorrect.isChecked = prefs.getBoolean(KEY_AUTO_CORRECT, true)
        switchCompletion.isChecked = prefs.getBoolean(KEY_COMPLETION, true)

        val savedLanguage = prefs.getString(KEY_LANGUAGE, DEFAULT_LANGUAGE) ?: DEFAULT_LANGUAGE
        spinnerLanguage.setSelection(languageCodes.indexOf(savedLanguage).coerceAtLeast(0))

        editServerToken.setText(EncryptedKeyStore.getServerToken(this))

        findViewById<MaterialButton>(R.id.buttonActivateKeyboard).setOnClickListener {
            KeyboardSetup.openImeSettings(this)
        }

        findViewById<MaterialButton>(R.id.buttonChangeEmail).setOnClickListener {
            // Relance l'écran de connexion : le code partira sur la nouvelle adresse.
            // Le token actuel n'est remplacé qu'après une connexion réussie.
            startActivity(
                Intent(this, LoginActivity::class.java)
                    .putExtra(LoginActivity.EXTRA_FORCE_LOGIN, true),
            )
        }

        buttonSave.setOnClickListener {
            prefs.edit()
                .putBoolean(KEY_AUTO_CORRECT, switchAutoCorrect.isChecked)
                .putBoolean(KEY_COMPLETION, switchCompletion.isChecked)
                .putString(KEY_LANGUAGE, languageCodes[spinnerLanguage.selectedItemPosition])
                .apply()

            EncryptedKeyStore.setServerToken(this, editServerToken.text?.toString().orEmpty())

            Toast.makeText(this, getString(R.string.toast_settings_saved), Toast.LENGTH_SHORT).show()
        }
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            android.R.id.home -> {
                finish()
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }

    companion object {
        const val PREFS_NAME = "ime_prefs"
        const val KEY_AUTO_CORRECT = "auto_correct"
        const val KEY_COMPLETION = "word_completion"
        const val KEY_LANGUAGE = "language"
        const val DEFAULT_LANGUAGE = "fr"
    }
}
