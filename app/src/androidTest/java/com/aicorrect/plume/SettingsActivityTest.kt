package com.aicorrect.plume

import android.app.Activity
import android.app.Instrumentation.ActivityResult
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.test.core.app.ActivityScenario
import androidx.test.espresso.Espresso.onData
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.intent.Intents
import androidx.test.espresso.intent.Intents.intended
import androidx.test.espresso.intent.Intents.intending
import androidx.test.espresso.intent.matcher.IntentMatchers.hasAction
import androidx.test.espresso.intent.matcher.IntentMatchers.hasComponent
import androidx.test.espresso.intent.matcher.IntentMatchers.hasData
import androidx.test.espresso.intent.matcher.IntentMatchers.hasExtra
import androidx.test.espresso.matcher.ViewMatchers.Visibility
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withEffectiveVisibility
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withSpinnerText
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.hamcrest.CoreMatchers.allOf
import org.hamcrest.CoreMatchers.`is`
import org.hamcrest.CoreMatchers.instanceOf
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Tests instrumentés (Espresso) de l'écran Paramètres, exécutables sur Firebase
 * Test Lab. Couvre en particulier le nouveau bouton « Gérer l'abonnement » et son
 * lien vers aicorrect.app, ainsi que la persistance des réglages.
 *
 * Déterministes et hors-réseau : on vide le token avant chaque test, donc le
 * bouton billing emprunte la voie de repli (ouverture directe de l'URL), vérifiée
 * via espresso-intents — pas d'appel HTTP, pas de dépendance à un navigateur.
 */
@RunWith(AndroidJUnit4::class)
class SettingsActivityTest {

    private val ctx: Context = InstrumentationRegistry.getInstrumentation().targetContext
    private val billingUrl get() = ctx.getString(R.string.settings_billing_url)

    private fun imePrefs() = (
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) ctx.createDeviceProtectedStorageContext() else ctx
    ).getSharedPreferences("ime_prefs", Context.MODE_PRIVATE)

    @Before
    fun reset() {
        // État déterministe : pas de token (voie de repli du bouton billing) et prefs vierges.
        EncryptedKeyStore.setServerToken(ctx, "")
        imePrefs().edit().clear().commit()
    }

    @After
    fun cleanup() {
        imePrefs().edit().clear().commit()
    }

    @Test
    fun billingButtonAndDescriptionDisplayed() {
        ActivityScenario.launch(SettingsActivity::class.java).use {
            onView(withId(R.id.buttonBilling))
                .check(matches(allOf(isDisplayed(), withText(R.string.settings_billing))))
            onView(withText(R.string.settings_billing_desc)).check(matches(isDisplayed()))
        }
    }

    /** Test phare du lien : sans token, le clic ouvre https://aicorrect.app (intent VIEW). */
    @Test
    fun billingButtonWithoutTokenOpensAicorrectSite() {
        Intents.init()
        try {
            // Empêche le vrai navigateur de se lancer pendant le test.
            intending(hasAction(Intent.ACTION_VIEW))
                .respondWith(ActivityResult(Activity.RESULT_OK, null))
            ActivityScenario.launch(SettingsActivity::class.java).use {
                onView(withId(R.id.buttonBilling)).perform(click())
                intended(allOf(hasAction(Intent.ACTION_VIEW), hasData(Uri.parse(billingUrl))))
            }
        } finally {
            Intents.release()
        }
    }

    /**
     * Smoke réel (best-effort) : sans stub, le clic émet vraiment l'intent. On
     * vérifie surtout l'absence de crash (openUrl capture ActivityNotFoundException
     * en toast). Utile pour valider la résolution d'intent sur chaque modèle/version.
     */
    @Test
    fun billingButtonWithoutTokenDoesNotCrash() {
        ActivityScenario.launch(SettingsActivity::class.java).use {
            onView(withId(R.id.buttonBilling)).perform(click())
            // Aucune assertion supplémentaire : le succès = pas d'exception non gérée.
        }
    }

    @Test
    fun changeEmailButtonLaunchesLoginWithForceFlag() {
        Intents.init()
        try {
            intending(hasComponent(LoginActivity::class.java.name))
                .respondWith(ActivityResult(Activity.RESULT_OK, null))
            ActivityScenario.launch(SettingsActivity::class.java).use {
                onView(withId(R.id.buttonChangeEmail)).perform(click())
                intended(
                    allOf(
                        hasComponent(LoginActivity::class.java.name),
                        hasExtra(LoginActivity.EXTRA_FORCE_LOGIN, true),
                    ),
                )
            }
        } finally {
            Intents.release()
        }
    }

    @Test
    fun accountEmailShownWhenSaved() {
        imePrefs().edit().putString("email", "user@test.com").commit()
        ActivityScenario.launch(SettingsActivity::class.java).use {
            onView(withId(R.id.accountEmail)).check(
                matches(allOf(isDisplayed(), withText(ctx.getString(R.string.settings_account, "user@test.com")))),
            )
        }
    }

    @Test
    fun accountEmailHiddenWhenEmpty() {
        ActivityScenario.launch(SettingsActivity::class.java).use {
            onView(withId(R.id.accountEmail))
                .check(matches(withEffectiveVisibility(Visibility.GONE)))
        }
    }

    @Test
    fun completionSwitchDefaultsCheckedAndPersists() {
        // Par défaut : activé.
        ActivityScenario.launch(SettingsActivity::class.java).use {
            onView(withId(R.id.switchCompletion)).check(matches(isDisplayed()))
            onView(withId(R.id.switchCompletion)).perform(click()) // -> décoché
        }
        assertEquals(false, imePrefs().getBoolean("word_completion", true))

        // Relance : l'état décoché est persisté.
        ActivityScenario.launch(SettingsActivity::class.java).use {
            onView(withId(R.id.switchCompletion)).perform(click()) // -> recoché
        }
        assertEquals(true, imePrefs().getBoolean("word_completion", false))
    }

    @Test
    fun languageSpinnerSelectionPersists() {
        // On part de "en" pour garantir un vrai changement de position vers "Français"
        // quelle que soit la locale de l'appareil (sélectionner l'item déjà actif ne
        // déclenche pas onItemSelected).
        imePrefs().edit().putString("language", "en").commit()
        ActivityScenario.launch(SettingsActivity::class.java).use {
            onView(withId(R.id.spinnerLanguage)).perform(click())
            onData(allOf(`is`(instanceOf(String::class.java)), `is`(ctx.getString(R.string.language_french))))
                .perform(click())
        }
        assertEquals("fr", imePrefs().getString("language", null))

        // Relance : le spinner reflète « Français ».
        ActivityScenario.launch(SettingsActivity::class.java).use {
            onView(withId(R.id.spinnerLanguage))
                .check(matches(withSpinnerText(ctx.getString(R.string.language_french))))
        }
    }
}
