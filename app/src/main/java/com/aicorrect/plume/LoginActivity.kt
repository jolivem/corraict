package com.aicorrect.plume

import android.content.Context
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
    private lateinit var buttonActivateKeyboard: MaterialButton
    private lateinit var buttonChooseKeyboard: MaterialButton
    private lateinit var activateStatus: TextView
    private lateinit var chooseStatus: TextView
    private lateinit var loginReady: TextView

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

        // L'écran a son propre titre « Connexion à Plume » dans le contenu : on masque
        // la barre d'action « AiCorrect » (redondante, et qui tronquait le texte en haut).
        supportActionBar?.hide()

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

        buttonActivateKeyboard = findViewById(R.id.buttonActivateKeyboard)
        buttonChooseKeyboard = findViewById(R.id.buttonChooseKeyboard)
        activateStatus = findViewById(R.id.activateStatus)
        chooseStatus = findViewById(R.id.chooseStatus)
        loginReady = findViewById(R.id.loginReady)

        buttonActivateKeyboard.setOnClickListener { KeyboardSetup.openImeSettings(this) }
        buttonChooseKeyboard.setOnClickListener { KeyboardSetup.showImePicker(this) }
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
                    saveEmail(email)
                    setBusy(buttonVerify, false, R.string.login_verify)
                    showStep(stepDone)
                    refreshActivationState()
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
        // Pas de finish() : on garde cet écran dans la pile pour que « Retour » depuis
        // les paramètres avancés y revienne (au lieu de fermer l'app).
        startActivity(Intent(this, SettingsActivity::class.java))
    }

    /** Mémorise l'e-mail connecté pour l'afficher dans les paramètres. Stocké dans
     *  les prefs (device-protected, comme les autres réglages clavier). */
    private fun saveEmail(value: String) {
        val storageContext =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) createDeviceProtectedStorageContext() else this
        storageContext.getSharedPreferences(SettingsActivity.PREFS_NAME, Context.MODE_PRIVATE)
            .edit().putString(SettingsActivity.KEY_EMAIL, value).apply()
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

    /**
     * Met à jour l'écran « connecté » selon l'état réel du clavier :
     *  - étape 1 cochée si Plume est autorisé ;
     *  - étape 2 activée seulement une fois l'étape 1 faite, cochée si Plume est le
     *    clavier par défaut ;
     *  - message « Plume est prêt » quand tout est en place.
     */
    private fun refreshActivationState() {
        val enabled = KeyboardSetup.isImeEnabled(this)
        val selected = KeyboardSetup.isImeSelected(this)

        activateStatus.visibility = if (enabled) View.VISIBLE else View.GONE
        buttonChooseKeyboard.isEnabled = enabled && !selected
        chooseStatus.visibility = if (selected) View.VISIBLE else View.GONE
        loginReady.visibility = if (selected) View.VISIBLE else View.GONE
    }

    override fun onResume() {
        super.onResume()
        // Retour des réglages système (activité → activité) : couvre les appareils où
        // onWindowFocusChanged ne se redéclenche pas comme attendu.
        refreshActivationStateIfVisible()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        // Reprise de focus après le sélecteur de clavier (un dialog système qui ne
        // déclenche pas toujours onResume).
        if (hasFocus) refreshActivationStateIfVisible()
    }

    /** Rafraîchit l'état des 2 étapes seulement si l'écran « connecté » est affiché.
     *  Le garde `isInitialized` protège le chemin où onCreate finit tôt (déjà
     *  connecté → redirection) sans avoir initialisé les vues. */
    private fun refreshActivationStateIfVisible() {
        if (::stepDone.isInitialized && stepDone.visibility == View.VISIBLE) {
            refreshActivationState()
        }
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
