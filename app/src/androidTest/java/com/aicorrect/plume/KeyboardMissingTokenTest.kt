package com.aicorrect.plume

import android.content.Intent
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.Until
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.util.regex.Pattern

/**
 * Test instrumenté (UIAutomator) du chemin « aucun token » du clavier : appuyer sur
 * Corriger sans token configuré doit afficher la popup d'inscription (pas la popup
 * d'abonnement) et laisser le texte intact. Aucun réseau ni credential requis — ce
 * test tourne à chaque exécution Firebase Test Lab (ne se skip jamais).
 */
@RunWith(AndroidJUnit4::class)
class KeyboardMissingTokenTest {

    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val device = UiDevice.getInstance(instrumentation)
    private val ctx = instrumentation.targetContext

    private val pkg = "com.aicorrect.plume"
    private val ime = "$pkg/.CorrectKeyboardService"
    private val faulty = "je veux mangé une pomme demain matin sa vas etre bon"
    private val shots = File(ctx.getExternalFilesDir(null), "screenshots").apply { mkdirs() }

    @Before
    fun setUp() {
        device.executeShellCommand("ime enable $ime")
        device.executeShellCommand("ime set $ime")
        device.waitForIdle()
        // Aucun token : déclenche showMissingTokenDialog au clic sur Corriger.
        EncryptedKeyStore.setServerToken(ctx, "")
    }

    @After
    fun tearDown() {
        device.executeShellCommand("ime reset")
    }

    @Test
    fun missingTokenShowsSignupDialog() {
        val intent = Intent(ctx, LoginActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
            .putExtra(LoginActivity.EXTRA_FORCE_LOGIN, true)
        ctx.startActivity(intent)
        assertTrue(
            "Champ de saisie (editEmail) introuvable",
            device.wait(Until.hasObject(By.res(pkg, "editEmail")), 10_000),
        )
        val field = device.findObject(By.res(pkg, "editEmail"))
        field.click()
        field.text = faulty
        device.waitForIdle()

        assertTrue(
            "Le clavier Plume (btnCorrect) n'est pas apparu",
            device.wait(Until.hasObject(By.res(pkg, "btnCorrect")), 10_000),
        )
        device.findObject(By.res(pkg, "btnCorrect")).click()

        // La popup « token manquant » affiche le message d'inscription.
        val shown = device.wait(
            Until.hasObject(By.text(Pattern.compile("(?i).*inscrivez-vous.*"))),
            8_000,
        )
        device.takeScreenshot(File(shots, "missing_token_dialog.png"))
        assertTrue("La popup d'inscription (token manquant) n'est pas apparue", shown)

        // Ce n'est PAS la popup d'abonnement.
        assertEquals(
            "La popup d'abonnement ne devrait pas apparaître sans token",
            false,
            device.hasObject(By.text(Pattern.compile("(?i).*veuillez vous abonner.*"))),
        )

        // Texte inchangé.
        assertEquals(faulty, device.findObject(By.res(pkg, "editEmail"))?.text)
    }
}
