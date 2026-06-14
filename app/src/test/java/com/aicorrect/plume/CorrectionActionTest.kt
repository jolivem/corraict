package com.aicorrect.plume

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Tests unitaires JVM du routage d'erreur de correction extrait de
 * CorrectKeyboardService.finalizeCorrection : quel comportement UI pour quel code.
 */
class CorrectionActionTest {

    @Test
    fun billingRequiredShowsSubscriptionDialog() {
        assertEquals(CorrectionAction.ShowSubscriptionDialog, correctionAction("billing_required"))
    }

    @Test
    fun quotaExceededShowsQuotaToast() {
        assertEquals(CorrectionAction.ShowQuotaToast, correctionAction("quota_exceeded"))
    }

    @Test
    fun nullCodeShowsGenericFailure() {
        assertEquals(CorrectionAction.ShowGenericFailure, correctionAction(null))
    }

    @Test
    fun unknownCodeShowsGenericFailure() {
        assertEquals(CorrectionAction.ShowGenericFailure, correctionAction("account_suspended"))
        assertEquals(CorrectionAction.ShowGenericFailure, correctionAction("whatever"))
    }
}
