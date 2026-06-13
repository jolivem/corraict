package com.example.aicorrect

import android.content.Intent
import android.os.SystemClock
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.Until
import org.junit.After
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File

/**
 * Test instrumenté de bout en bout du clavier AiCorrect, exécutable sur
 * Firebase Test Lab (type `instrumentation`).
 *
 * Déroulé :
 *   1. active + sélectionne CorrectKeyboardService comme IME par défaut (cmd `ime`) ;
 *   2. injecte un vrai token serveur (passé en argument d'instrumentation) ;
 *   3. ouvre l'écran de connexion (champ `editEmail` visible) en forçant l'affichage
 *      malgré le token déjà présent (EXTRA_FORCE_LOGIN) ;
 *   4. tape une phrase fautive dans le champ via UiAutomator (vrai chemin de saisie,
 *      donc l'InputConnection du clavier voit bien le texte) ;
 *   5. appuie sur « Corriger » (btnCorrect) et attend que le texte change.
 *
 * Des captures d'écran sont prises avant/après et déposées dans
 * getExternalFilesDir/screenshots — récupérées par `--directories-to-pull`.
 *
 * Token : --environment-variables aicorrectToken=aic_xxx (Firebase) ou
 * -Pandroid.testInstrumentationRunnerArguments.aicorrectToken=aic_xxx (Gradle).
 * Sans token, le test est ignoré (assumeTrue) plutôt qu'en échec.
 */
@RunWith(AndroidJUnit4::class)
class KeyboardCorrectionTest {

    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val device = UiDevice.getInstance(instrumentation)
    private val ctx = instrumentation.targetContext

    private val pkg = "com.example.aicorrect"
    private val ime = "$pkg/.CorrectKeyboardService"

    // Phrase volontairement fautive (fr) : le backend doit la corriger.
    private val faulty = "je veux mangé une pomme demain matin sa vas etre bon"

    private val shots = File(ctx.getExternalFilesDir(null), "screenshots").apply { mkdirs() }

    @Before
    fun setUp() {
        // 1) Active puis sélectionne le clavier AiCorrect comme IME par défaut.
        device.executeShellCommand("ime enable $ime")
        device.executeShellCommand("ime set $ime")
        device.waitForIdle()

        // 2) Injecte un vrai token serveur (sinon test ignoré).
        val token = InstrumentationRegistry.getArguments().getString("aicorrectToken").orEmpty()
        assumeTrue(
            "Aucun token fourni (-e aicorrectToken …) — test ignoré.",
            token.isNotBlank(),
        )
        EncryptedKeyStore.setServerToken(ctx, token)
    }

    @After
    fun tearDown() {
        device.executeShellCommand("ime reset")
    }

    @Test
    fun correctionReplacesFaultyText() {
        // 3) Ouvre l'écran de connexion (champ e-mail) en forçant l'affichage
        //    malgré le token déjà injecté.
        val intent = Intent(ctx, LoginActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
            .putExtra(LoginActivity.EXTRA_FORCE_LOGIN, true)
        ctx.startActivity(intent)

        // Le champ de saisie doit apparaître.
        assertTrue(
            "Champ de saisie (editEmail) introuvable",
            device.wait(Until.hasObject(By.res(pkg, "editEmail")), 10_000),
        )

        // 4) Tape la phrase fautive dans le champ (vrai chemin de saisie).
        val field = device.findObject(By.res(pkg, "editEmail"))
        field.click()
        field.text = faulty
        device.waitForIdle()

        // Le clavier AiCorrect doit s'afficher : on attend le bouton « Corriger ».
        assertTrue(
            "Le clavier AiCorrect (btnCorrect) n'est pas apparu",
            device.wait(Until.hasObject(By.res(pkg, "btnCorrect")), 10_000),
        )
        screenshot("1_avant_correction")

        // 5) Déclenche la correction.
        device.findObject(By.res(pkg, "btnCorrect")).click()

        // Attend que le texte change (réponse backend, lecture jusqu'à 45 s côté client).
        val deadline = SystemClock.uptimeMillis() + 50_000
        var result: String = faulty
        while (SystemClock.uptimeMillis() < deadline) {
            result = device.findObject(By.res(pkg, "editEmail"))?.text ?: result
            if (result != faulty) break
            SystemClock.sleep(500)
        }
        screenshot("2_apres_correction")

        assertNotEquals(
            "Le texte n'a pas été corrigé (resté inchangé). Captures : ${shots.absolutePath}",
            faulty,
            result,
        )
        assertFalse("Le champ est vide après correction", result.isBlank())
    }

    private fun screenshot(name: String) {
        device.takeScreenshot(File(shots, "$name.png"))
    }
}
