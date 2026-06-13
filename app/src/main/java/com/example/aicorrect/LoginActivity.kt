package com.example.aicorrect

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.util.Patterns
import android.view.View
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout

/**
 * Connexion in-app : email → code → token, sans passer par le site ni un QR code.
 * À la fin, propose d'activer le clavier en un tap. Activity de lancement de l'app.
 *
 * Si un token serveur existe déjà, on redirige directement vers les paramètres
 * (utilisateur déjà connecté).
 */
class LoginActivity : AppCompatActivity() {

    private lateinit var stepLogin: View
    private lateinit var stepDone: View
    private lateinit var editEmail: TextInputEditText
    private lateinit var editCode: TextInputEditText
    private lateinit var codeInputLayout: TextInputLayout
    private lateinit var codeInfo: TextView
    private lateinit var buttonSendCode: MaterialButton
    private lateinit var buttonVerify: MaterialButton
    private lateinit var status: TextView

    private var email: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Déjà connecté → on file aux paramètres, sauf si on force la connexion
        // (changement d'adresse e-mail demandé depuis les réglages).
        val forceLogin = intent.getBooleanExtra(EXTRA_FORCE_LOGIN, false)
        if (!forceLogin && EncryptedKeyStore.getServerToken(this).isNotEmpty()) {
            startActivity(Intent(this, SettingsActivity::class.java))
            finish()
            return
        }

        setContentView(R.layout.activity_login)

        stepLogin = findViewById(R.id.stepLogin)
        stepDone = findViewById(R.id.stepDone)
        editEmail = findViewById(R.id.editEmail)
        editCode = findViewById(R.id.editCode)
        codeInputLayout = findViewById(R.id.codeInputLayout)
        codeInfo = findViewById(R.id.codeInfo)
        buttonSendCode = findViewById(R.id.buttonSendCode)
        buttonVerify = findViewById(R.id.buttonVerify)
        status = findViewById(R.id.loginStatus)

        buttonSendCode.setOnClickListener { onSendCode() }
        buttonVerify.setOnClickListener { onVerify() }
        findViewById<MaterialButton>(R.id.buttonAdvanced).setOnClickListener { openSettings() }

        findViewById<MaterialButton>(R.id.buttonActivateKeyboard).setOnClickListener {
            KeyboardSetup.openImeSettings(this)
        }
        findViewById<MaterialButton>(R.id.buttonChooseKeyboard).setOnClickListener {
            KeyboardSetup.showImePicker(this)
        }
        findViewById<MaterialButton>(R.id.buttonGoSettings).setOnClickListener { openSettings() }
    }

    private fun onSendCode() {
        val value = editEmail.text?.toString()?.trim().orEmpty().lowercase()
        if (value.isEmpty() || !Patterns.EMAIL_ADDRESS.matcher(value).matches()) {
            showError(getString(R.string.login_error_email))
            return
        }
        email = value
        setBusy(buttonSendCode, true, R.string.login_sending)
        clearError()
        AuthClient.requestCode(
            email = email,
            locale = deviceLocale(),
            onSuccess = {
                runOnUiThread {
                    setBusy(buttonSendCode, false, R.string.login_send_code)
                    enableCodeEntry()
                }
            },
            onError = { key ->
                runOnUiThread {
                    setBusy(buttonSendCode, false, R.string.login_send_code)
                    showError(messageFor(key))
                }
            },
        )
    }

    private fun onVerify() {
        val code = editCode.text?.toString()?.trim().orEmpty()
        if (code.length < 4) {
            showError(getString(R.string.login_error_code))
            return
        }
        setBusy(buttonVerify, true, R.string.login_verifying)
        clearError()
        AuthClient.loginAndCreateToken(
            email = email,
            code = code,
            label = deviceLabel(),
            onSuccess = { token ->
                runOnUiThread {
                    EncryptedKeyStore.setServerToken(this, token)
                    setBusy(buttonVerify, false, R.string.login_verify)
                    showStep(stepDone)
                }
            },
            onError = { key ->
                runOnUiThread {
                    setBusy(buttonVerify, false, R.string.login_verify)
                    showError(messageFor(key))
                }
            },
        )
    }

    private fun openSettings() {
        startActivity(Intent(this, SettingsActivity::class.java))
        finish()
    }

    /**
     * Le code est arrivé par mail : on active le champ code + « Valider » (restés
     * grisés jusque-là), sans masquer l'email. Sert aussi de renvoi : on vide le
     * champ code pour repartir propre.
     */
    private fun enableCodeEntry() {
        codeInputLayout.isEnabled = true
        editCode.isEnabled = true
        buttonVerify.isEnabled = true
        codeInfo.visibility = View.VISIBLE
        editCode.text?.clear()
        editCode.requestFocus()
        clearError()
    }

    private fun showStep(step: View) {
        stepLogin.visibility = if (step === stepLogin) View.VISIBLE else View.GONE
        stepDone.visibility = if (step === stepDone) View.VISIBLE else View.GONE
        clearError()
    }

    private fun setBusy(button: MaterialButton, busy: Boolean, labelRes: Int) {
        button.isEnabled = !busy
        button.setText(labelRes)
    }

    private fun showError(message: String) {
        status.text = message
    }

    private fun clearError() {
        status.text = ""
    }

    private fun messageFor(key: String): String = when (key) {
        "code" -> getString(R.string.login_error_code)
        "rate" -> getString(R.string.login_error_rate)
        "network" -> getString(R.string.login_error_network)
        else -> getString(R.string.login_error_generic)
    }

    private fun deviceLocale(): String {
        val lang = resources.configuration.locales[0].language
        return if (lang == "en") "en" else "fr"
    }

    private fun deviceLabel(): String {
        val model = listOf(Build.MANUFACTURER, Build.MODEL)
            .filter { !it.isNullOrBlank() }
            .joinToString(" ")
            .trim()
        return model.ifBlank { "Android" }.take(100)
    }

    companion object {
        /** Force l'affichage de l'écran de connexion même si un token existe déjà. */
        const val EXTRA_FORCE_LOGIN = "force_login"
    }
}
