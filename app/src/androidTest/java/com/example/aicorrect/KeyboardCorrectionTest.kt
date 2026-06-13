package com.example.aicorrect

import android.app.Activity
import android.content.Intent
import androidx.test.core.app.ActivityScenario
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

/**
 * Test instrumenté de bout en bout du clavier AiCorrect, exécutable sur
 * Firebase Test Lab (type `instrumentation`).
 *
 * Déroulé :
 *   1. active + sélectionne CorrectKeyboardService comme IME par défaut (cmd `ime`) ;
 *   2. injecte un vrai token serveur (passé en argument d'instrumentation) ;
 *   3. ouvre un champ de saisie → le clavier s'affiche ;
 *   4. pré-remplit une phrase fautive et appuie sur « Corriger » (btnCorrect) ;
 *   5. attend la réponse du backend et vérifie que le texte a changé.
 *
 * Le token se fournit ainsi :
 *   - Firebase :  --environment-variables aicorrectToken=aic_xxx
 *   - Gradle   :  -Pandroid.testInstrumentationRunnerArguments.aicorrectToken=aic_xxx
 * Sans token, le test est ignoré (assumeTrue) plutôt qu'en échec.
 */
@RunWith(AndroidJUnit4::class)
class KeyboardCorrectionTest {

    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val device = UiDevice.getInstance(instrumentation)

    private val pkg = "com.example.aicorrect"
    private val ime = "$pkg/.CorrectKeyboardService"

    // Phrase volontairement fautive (fr) : le backend doit la corriger.
    private val faulty = "je veux mangé une pomme demain matin sa vas etre bon"

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
        EncryptedKeyStore.setServerToken(instrumentation.targetContext, token)
    }

    @After
    fun tearDown() {
        // Remet l'IME du système dans son état par défaut.
        device.executeShellCommand("ime reset")
    }

    @Test
    fun correctionReplacesFaultyText() {
        // Intent explicite construit avec le contexte de l'app : force le composant
        // dans le package com.example.aicorrect (et non com.example.aicorrect.test),
        // sinon ActivityScenario résout l'activité dans le mauvais process.
        val intent = Intent(instrumentation.targetContext, EditorTestActivity::class.java)
        ActivityScenario.launch<Activity>(intent).use { scenario ->
            // Pré-remplit le champ avec le texte fautif (curseur en fin).
            scenario.onActivity { (it as EditorTestActivity).setText(faulty) }

            // Le clavier AiCorrect doit s'afficher : on attend le bouton « Corriger ».
            val keyboardShown = device.wait(Until.hasObject(By.res(pkg, "btnCorrect")), 10_000)
            assertTrue("Le clavier AiCorrect (btnCorrect) n'est pas apparu", keyboardShown)

            device.findObject(By.res(pkg, "btnCorrect")).click()

            // Attend la réponse du backend (lecture jusqu'à 45 s côté client).
            val deadline = System.currentTimeMillis() + 50_000
            var result = faulty
            while (System.currentTimeMillis() < deadline) {
                result = currentText(scenario)
                if (result != faulty) break
                Thread.sleep(500)
            }

            assertNotEquals("Le texte n'a pas été corrigé (resté inchangé)", faulty, result)
            assertFalse("Le champ est vide après correction", result.isBlank())
        }
    }

    private fun currentText(scenario: ActivityScenario<Activity>): String {
        var text = ""
        scenario.onActivity { text = (it as EditorTestActivity).currentText() }
        return text
    }
}
