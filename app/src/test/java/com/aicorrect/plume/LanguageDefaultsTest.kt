package com.aicorrect.plume

import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import java.util.Locale

/**
 * Tests unitaires JVM (rapides, sans device) de [deviceDefaultLanguage] :
 * français si l'appareil est en français, anglais sinon.
 */
class LanguageDefaultsTest {

    private lateinit var original: Locale

    @Before
    fun saveLocale() {
        original = Locale.getDefault()
    }

    @After
    fun restoreLocale() {
        Locale.setDefault(original)
    }

    @Test
    fun frenchLocaleReturnsFr() {
        Locale.setDefault(Locale.FRENCH)
        assertEquals("fr", deviceDefaultLanguage())
    }

    @Test
    fun frenchCanadaReturnsFr() {
        Locale.setDefault(Locale("fr", "CA"))
        assertEquals("fr", deviceDefaultLanguage())
    }

    @Test
    fun englishLocaleReturnsEn() {
        Locale.setDefault(Locale.ENGLISH)
        assertEquals("en", deviceDefaultLanguage())
    }

    @Test
    fun germanLocaleFallsBackToEn() {
        Locale.setDefault(Locale.GERMAN)
        assertEquals("en", deviceDefaultLanguage())
    }

    @Test
    fun japaneseLocaleFallsBackToEn() {
        Locale.setDefault(Locale.JAPANESE)
        assertEquals("en", deviceDefaultLanguage())
    }
}
