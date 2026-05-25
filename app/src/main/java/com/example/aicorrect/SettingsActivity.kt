package com.example.aicorrect

import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
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
    private lateinit var spinnerLanguage: Spinner
    private lateinit var spinnerProvider: Spinner
    private lateinit var editModel: TextInputEditText
    private lateinit var editApiKey: TextInputEditText
    private lateinit var buttonSave: MaterialButton
    private lateinit var buttonTestConnection: MaterialButton

    private val mainHandler = Handler(Looper.getMainLooper())

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
        spinnerLanguage = findViewById(R.id.spinnerLanguage)
        spinnerProvider = findViewById(R.id.spinnerProvider)
        editModel = findViewById(R.id.editModel)
        editApiKey = findViewById(R.id.editApiKey)
        buttonSave = findViewById(R.id.buttonSave)
        buttonTestConnection = findViewById(R.id.buttonTestConnection)

        val languageLabels = listOf(
            getString(R.string.language_french),
            getString(R.string.language_english),
        )
        val languageCodes = listOf("fr", "en")
        val languageAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, languageLabels)
        languageAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        spinnerLanguage.adapter = languageAdapter

        val providerLabels = listOf(getString(R.string.provider_mistral))
        val providerCodes = listOf(PROVIDER_MISTRAL)
        val providerAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, providerLabels)
        providerAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        spinnerProvider.adapter = providerAdapter

        val prefs = getPreferences()
        switchAutoCorrect.isChecked = prefs.getBoolean(KEY_AUTO_CORRECT, true)

        val savedLanguage = prefs.getString(KEY_LANGUAGE, DEFAULT_LANGUAGE) ?: DEFAULT_LANGUAGE
        spinnerLanguage.setSelection(languageCodes.indexOf(savedLanguage).coerceAtLeast(0))

        val savedProvider = prefs.getString(KEY_PROVIDER, PROVIDER_MISTRAL) ?: PROVIDER_MISTRAL
        spinnerProvider.setSelection(providerCodes.indexOf(savedProvider).coerceAtLeast(0))

        editModel.setText(prefs.getString(KEY_MODEL, DEFAULT_MODEL) ?: DEFAULT_MODEL)

        migrateLegacyApiKey(prefs)
        editApiKey.setText(EncryptedKeyStore.getApiKey(this))

        buttonTestConnection.setOnClickListener { runConnectionTest() }

        buttonSave.setOnClickListener {
            val modelValue = editModel.text?.toString()?.trim().orEmpty().ifEmpty { DEFAULT_MODEL }
            prefs.edit()
                .putBoolean(KEY_AUTO_CORRECT, switchAutoCorrect.isChecked)
                .putString(KEY_LANGUAGE, languageCodes[spinnerLanguage.selectedItemPosition])
                .putString(KEY_PROVIDER, providerCodes[spinnerProvider.selectedItemPosition])
                .putString(KEY_MODEL, modelValue)
                .apply()

            EncryptedKeyStore.setApiKey(this, editApiKey.text?.toString().orEmpty())

            Toast.makeText(this, getString(R.string.toast_settings_saved), Toast.LENGTH_SHORT).show()
        }
    }

    private fun migrateLegacyApiKey(prefs: SharedPreferences) {
        val legacy = prefs.getString(KEY_API_KEY, null)
        if (!legacy.isNullOrBlank()) {
            EncryptedKeyStore.setApiKey(this, legacy)
            prefs.edit().remove(KEY_API_KEY).apply()
        }
    }

    private fun runConnectionTest() {
        val apiKey = editApiKey.text?.toString()?.trim().orEmpty()
        if (apiKey.isEmpty()) {
            Toast.makeText(this, getString(R.string.toast_test_no_key), Toast.LENGTH_SHORT).show()
            return
        }

        val originalLabel = buttonTestConnection.text
        buttonTestConnection.isEnabled = false
        buttonTestConnection.text = getString(R.string.btn_test_connection_in_progress)

        MistralClient.testConnection(
            apiKey = apiKey,
            onSuccess = {
                mainHandler.post {
                    buttonTestConnection.isEnabled = true
                    buttonTestConnection.text = originalLabel
                    Toast.makeText(this, getString(R.string.toast_test_success), Toast.LENGTH_SHORT).show()
                }
            },
            onError = { err ->
                mainHandler.post {
                    buttonTestConnection.isEnabled = true
                    buttonTestConnection.text = originalLabel
                    Toast.makeText(
                        this,
                        getString(R.string.toast_test_failed, err),
                        Toast.LENGTH_LONG
                    ).show()
                }
            },
        )
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
        const val KEY_LANGUAGE = "language"
        const val KEY_PROVIDER = "provider"
        const val KEY_MODEL = "model"
        const val KEY_API_KEY = "api_key"
        const val DEFAULT_LANGUAGE = "fr"
        const val PROVIDER_MISTRAL = "mistral"
        const val DEFAULT_MODEL = "mistral-small-latest"
    }
}
