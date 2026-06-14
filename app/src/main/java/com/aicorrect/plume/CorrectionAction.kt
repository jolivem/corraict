package com.aicorrect.plume

/**
 * Décision d'UI à prendre après une correction en échec, en fonction du code
 * d'erreur renvoyé par le backend. Extrait de [CorrectKeyboardService.finalizeCorrection]
 * pour être testable sans device (logique pure, aucune dépendance Android).
 */
internal sealed interface CorrectionAction {
    /** Pas d'abonnement actif (`billing_required`) : popup d'invitation à s'abonner. */
    object ShowSubscriptionDialog : CorrectionAction

    /** Quota atteint (`quota_exceeded`) : toast dédié. */
    object ShowQuotaToast : CorrectionAction

    /** Toute autre erreur : toast générique « Échec de la correction ». */
    object ShowGenericFailure : CorrectionAction
}

/**
 * Mappe le code d'erreur backend vers l'action d'UI. Appelé uniquement quand une
 * erreur est présente (sinon aucune action).
 */
internal fun correctionAction(errorCode: String?): CorrectionAction =
    when (errorCode) {
        "billing_required" -> CorrectionAction.ShowSubscriptionDialog
        "quota_exceeded" -> CorrectionAction.ShowQuotaToast
        else -> CorrectionAction.ShowGenericFailure
    }
