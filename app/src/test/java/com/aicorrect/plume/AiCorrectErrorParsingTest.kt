package com.aicorrect.plume

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Tests unitaires JVM des helpers de parsing d'erreur d'[AiCorrectClient]
 * (mapping des codes backend vers code + message). Nécessite le vrai org.json
 * sur le classpath de test (cf. testImplementation org.json dans build.gradle.kts).
 */
class AiCorrectErrorParsingTest {

    @Test
    fun billingRequiredCodeAndMessage() {
        val raw = """{"code":"billing_required","message":"An active subscription is required"}"""
        assertEquals("billing_required", AiCorrectClient.parseErrorCode(raw))
        assertEquals("Abonnement requis.", AiCorrectClient.parseErrorMessage(raw, 402))
    }

    @Test
    fun quotaExceededMapped() {
        val raw = """{"code":"quota_exceeded","quota":50}"""
        assertEquals("quota_exceeded", AiCorrectClient.parseErrorCode(raw))
        assertEquals("Quota de correction atteint.", AiCorrectClient.parseErrorMessage(raw, 402))
    }

    @Test
    fun accountSuspendedMapped() {
        val raw = """{"code":"account_suspended"}"""
        assertEquals("Compte suspendu.", AiCorrectClient.parseErrorMessage(raw, 403))
    }

    @Test
    fun correctionUnavailableMapped() {
        val raw = """{"code":"correction_unavailable"}"""
        assertEquals(
            "Service de correction temporairement indisponible.",
            AiCorrectClient.parseErrorMessage(raw, 503),
        )
    }

    @Test
    fun unknownCodeWithMessageFallsBackToMessage() {
        val raw = """{"code":"weird","message":"Boom"}"""
        assertEquals("Boom", AiCorrectClient.parseErrorMessage(raw, 400))
    }

    @Test
    fun unknownCodeWithoutMessageUsesCode() {
        val raw = """{"code":"weird"}"""
        assertEquals("Erreur : weird", AiCorrectClient.parseErrorMessage(raw, 400))
    }

    @Test
    fun nestStringMessageNoCode() {
        val raw = """{"message":"Bad request","statusCode":400}"""
        assertEquals("", AiCorrectClient.parseErrorCode(raw))
        assertEquals("Bad request", AiCorrectClient.parseErrorMessage(raw, 400))
    }

    @Test
    fun blankBodyUsesHttpCode() {
        assertEquals("", AiCorrectClient.parseErrorCode(""))
        assertEquals("Erreur HTTP 500", AiCorrectClient.parseErrorMessage("", 500))
    }

    @Test
    fun malformedJsonIsGraceful() {
        val raw = "<<not json>>"
        assertEquals("", AiCorrectClient.parseErrorCode(raw))
        assertTrue(AiCorrectClient.parseErrorMessage(raw, 503).startsWith("HTTP 503:"))
    }
}
