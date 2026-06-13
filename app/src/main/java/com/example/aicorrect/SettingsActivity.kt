package com.example.aicorrect

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.os.Bundle
import android.view.MenuItem
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Spinner
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.button.MaterialButton
import com.google.android.material.switchmaterial.SwitchMaterial

class SettingsActivity : AppCompatActivity() {

    private lateinit var switchCompletion: SwitchMaterial
    private lateinit var spinnerLanguage: Spinner

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

        switchCompletion = findViewById(R.id.switchCompletion)
        spinnerLanguage = findViewById(R.id.spinnerLanguage)

        val languageLabels = listOf(
            getString(R.string.language_french),
            getString(R.string.language_english),
        )
        val languageCodes = listOf("fr", "en")
        val languageAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, languageLabels)
        languageAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        spinnerLanguage.adapter = languageAdapter

        val prefs = getPreferences()

        // Valeurs initiales (avant d'attacher les listeners, pour ne pas réécrire au démarrage).
        switchCompletion.isChecked = prefs.getBoolean(KEY_COMPLETION, true)
        val savedLanguage = prefs.getString(KEY_LANGUAGE, DEFAULT_LANGUAGE) ?: DEFAULT_LANGUAGE
        spinnerLanguage.setSelection(languageCodes.indexOf(savedLanguage).coerceAtLeast(0))

        // Enregistrement automatique : chaque changement est persisté immédiatement
        // (pas de bouton « Enregistrer »).
        switchCompletion.setOnCheckedChangeListener { _, checked ->
            prefs.edit().putBoolean(KEY_COMPLETION, checked).apply()
        }
        spinnerLanguage.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                prefs.edit().putString(KEY_LANGUAGE, languageCodes[position]).apply()
            }
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }

        // Compte connecté + changement d'adresse (relance la connexion sur une autre adresse).
        val accountEmail = findViewById<TextView>(R.id.accountEmail)
        val email = prefs.getString(KEY_EMAIL, "").orEmpty()
        if (email.isNotBlank()) {
            accountEmail.text = getString(R.string.settings_account, email)
            accountEmail.visibility = View.VISIBLE
        } else {
            accountEmail.visibility = View.GONE
        }
        findViewById<MaterialButton>(R.id.buttonChangeEmail).setOnClickListener {
            startActivity(
                Intent(this, LoginActivity::class.java)
                    .putExtra(LoginActivity.EXTRA_FORCE_LOGIN, true),
            )
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
        const val KEY_COMPLETION = "word_completion"
        const val KEY_LANGUAGE = "language"
        const val KEY_EMAIL = "email"
        const val DEFAULT_LANGUAGE = "fr"
    }
}
