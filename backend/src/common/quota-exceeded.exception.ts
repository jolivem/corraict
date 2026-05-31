import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Codes stables consommés par les clients (web et clavier Android) pour
 * afficher des messages adaptés. Ne pas modifier sans coordonner les clients.
 */
export type QuotaErrorCode =
  | 'quota_exceeded' // user a dépassé son quota mensuel (free tier)
  | 'account_suspended' // suspendu par un admin ou soft-deleted (RGPD)
  | 'billing_required'; // pas de subscription active alors qu'attendu

interface PayloadOptions {
  code: QuotaErrorCode;
  message: string;
  /**
   * Pour `quota_exceeded` : timestamp ISO de la date à laquelle l'utilisateur
   * pourra à nouveau consommer (typiquement le 1er du mois suivant).
   */
  retryAt?: string;
  /** Pour `quota_exceeded` : quota effectif et consommation courante. */
  quota?: number;
  used?: number;
}

const STATUS_BY_CODE: Record<QuotaErrorCode, HttpStatus> = {
  quota_exceeded: HttpStatus.PAYMENT_REQUIRED, // 402
  account_suspended: HttpStatus.FORBIDDEN, // 403
  billing_required: HttpStatus.PAYMENT_REQUIRED, // 402
};

export class QuotaExceededException extends HttpException {
  constructor(opts: PayloadOptions) {
    super(
      {
        code: opts.code,
        message: opts.message,
        ...(opts.retryAt ? { retryAt: opts.retryAt } : {}),
        ...(opts.quota != null ? { quota: opts.quota } : {}),
        ...(opts.used != null ? { used: opts.used } : {}),
      },
      STATUS_BY_CODE[opts.code],
    );
  }
}
