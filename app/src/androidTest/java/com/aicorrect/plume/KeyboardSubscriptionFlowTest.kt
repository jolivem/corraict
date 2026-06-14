package com.aicorrect.plume

import android.content.Intent
import android.os.SystemClock
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.Until
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.util.regex.Pattern

/**
 * Tests instrumentés (UIAutomator) du clavier selon l'état d'abonnement, exécutables
 * sur Firebase Test Lab. Couvre les deux chemins :
 *   - compte abonné  → la correction s'applique normalement ;
 *   - compte gratuit (sans abonnement) → le backend renvoie 402 billing_required
 *     et le clavier affiche la popup « Veuillez vous abonner » (texte inchangé).
 *
 * Tokens (args d'instrumentation, sinon test ignoré via assumeTrue) :
 *   - aicorrectTokenActive : compte abonné/trialing (repli sur aicorrectToken) ;
 *   - aicorrectTokenNoSub  : compte gratuit ordinaire (ni abonné, ni Pro, ni TEST_LOGIN).
 */
@RunWith(AndroidJUnit4::class)
class KeyboardSubscriptionFlowTest {

    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val device = UiDevice.getInstance(instrumentation)
    private val ctx = instrumentation.targetContext

    private val pkg = "com.aicorrect.plume"
    private val ime = "$pkg/.CorrectKeyboardService"
    private val faulty = "je veux mangé une pomme demain matin sa vas etre bon"
    private val shots = File(ctx.getExternalFilesDir(null), "screenshots").apply { mkdirs() }

    // Détecte la popup d'abonnement via son TITRE ou son MESSAGE (« …15 jours »).
    // Un titre d'AlertDialog rendu depuis un Service ne s'affiche pas toujours comme
    // nœud texte ; le message, lui, est fiable (et couvre aussi le repli en toast).
    private val subscribePopup: Pattern =
        Pattern.compile("(?i)(?s).*(veuillez vous abonner|15 jours).*")
    private val subscribeCta: Pattern = Pattern.compile("(?i)(?s).*s'abonner.*")

    private fun arg(name: String): String =
        InstrumentationRegistry.getArguments().getString(name).orEmpty()

    @Before
    fun enableIme() {
        device.executeShellCommand("ime enable $ime")
        device.executeShellCommand("ime set $ime")
        device.waitForIdle()
    }

    @After
    fun tearDown() {
        device.executeShellCommand("ime reset")
    }

    @Test
    fun correctionSucceedsForSubscribedAccount() {
        val token = arg("aicorrectTokenActive").ifBlank { arg("aicorrectToken") }
        assumeTrue("Aucun token abonné (aicorrectTokenActive/aicorrectToken) — ignoré.", token.isNotBlank())
        EncryptedKeyStore.setServerToken(ctx, token)

        openFieldWithFaultyText()
        clickCorrect()
        screenshot("sub_ok_1_avant")

        val result = waitForFieldChange(timeoutMs = 50_000)
        screenshot("sub_ok_2_apres")

        assertNotEquals("Texte non corrigé (compte abonné). Captures : ${shots.absolutePath}", faulty, result)
        assertFalse("Champ vide après correction", result.isBlank())
        // Pas de popup d'abonnement pour un compte abonné.
        assertFalse(
            "La popup d'abonnement ne devrait pas apparaître pour un abonné",
            device.wait(Until.hasObject(By.text(subscribePopup)), 3_000),
        )
    }

    @Test
    fun subscriptionDialogShownForFreeAccount() {
        val token = arg("aicorrectTokenNoSub")
        assumeTrue("Aucun token de compte gratuit (aicorrectTokenNoSub) — ignoré.", token.isNotBlank())
        EncryptedKeyStore.setServerToken(ctx, token)

        openFieldWithFaultyText()
        clickCorrect()

        val shown = device.wait(Until.hasObject(By.text(subscribePopup)), 25_000)
        screenshot("no_sub_popup")
        assertTrue(
            "Popup d'abonnement non affichée. Vérifie que le compte aicorrectTokenNoSub " +
                "est bien SANS abonnement (sinon il corrige). Voir capture no_sub_popup.png.",
            shown,
        )

        // Texte inchangé (lecture tolérante : le champ peut être masqué par la popup).
        val text = device.findObject(By.res(pkg, "editEmail"))?.text
        if (text != null) {
            assertEquals("Le texte ne devrait pas changer sans abonnement", faulty, text)
        }
    }

    /**
     * Best-effort : le CTA « S'abonner » ouvre le navigateur (magic-link). Toléré au
     * skip si l'image FTL n'a pas de navigateur (repli toast côté app, l'app reste au 1er plan).
     */
    @Test
    fun subscriptionCtaOpensBrowser() {
        val token = arg("aicorrectTokenNoSub")
        assumeTrue("Aucun token de compte gratuit (aicorrectTokenNoSub) — ignoré.", token.isNotBlank())
        EncryptedKeyStore.setServerToken(ctx, token)

        openFieldWithFaultyText()
        clickCorrect()
        assumeTrue(
            "Popup non affichée — sous-test ignoré.",
            device.wait(Until.hasObject(By.text(subscribePopup)), 25_000),
        )
        // Le CTA n'existe que si c'est bien un dialog (pas un repli toast) — sinon skip.
        val cta = device.findObject(By.text(subscribeCta))
        assumeTrue("Bouton « S'abonner » absent (popup en toast ?) — ignoré.", cta != null)
        cta.click()

        // L'app quitte le premier plan (navigateur/chooser) — sinon repli toast (skip).
        val leftApp = device.wait(Until.gone(By.pkg(pkg).depth(0)), 8_000)
        assumeTrue("Pas de navigateur sur l'appareil (repli toast) — sous-test ignoré.", leftApp)
        screenshot("no_sub_cta_browser")
    }

    // --- helpers ---------------------------------------------------------------

    private fun openFieldWithFaultyText() {
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
    }

    private fun clickCorrect() {
        assertTrue(
            "Le clavier Plume (btnCorrect) n'est pas apparu",
            device.wait(Until.hasObject(By.res(pkg, "btnCorrect")), 10_000),
        )
        device.findObject(By.res(pkg, "btnCorrect")).click()
    }

    private fun waitForFieldChange(timeoutMs: Long): String {
        val deadline = SystemClock.uptimeMillis() + timeoutMs
        var result = faulty
        while (SystemClock.uptimeMillis() < deadline) {
            result = device.findObject(By.res(pkg, "editEmail"))?.text ?: result
            if (result != faulty) break
            SystemClock.sleep(500)
        }
        return result
    }

    private fun screenshot(name: String) {
        device.takeScreenshot(File(shots, "$name.png"))
    }
}
