import { z } from 'zod';

/**
 * Validation BCP 47 "lite" : code langue 2 lettres minuscules, optionnellement
 * suffixé d'un code région 2 lettres majuscules (ex. fr, en, pt-BR, fr-CA).
 * Volontairement strict pour éviter le bruit (free-text en DB).
 */
const localeSchema = z
  .string()
  .regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'locale must be BCP 47 lite (e.g. fr, en, pt-BR)');

// ─── User endpoints ─────────────────────────────────────────────────────────

export const ActiveTermsQuerySchema = z.object({
  locale: localeSchema.optional(),
});
export type ActiveTermsQuery = z.infer<typeof ActiveTermsQuerySchema>;

export const AcceptTermsSchema = z.object({
  termsVersionId: z.string().min(1).max(64),
});
export type AcceptTermsDto = z.infer<typeof AcceptTermsSchema>;

// ─── Admin endpoints ────────────────────────────────────────────────────────

export const CreateTermsVersionSchema = z.object({
  label: z.string().trim().min(1).max(50),
});
export type CreateTermsVersionDto = z.infer<typeof CreateTermsVersionSchema>;

export const UpdateTermsVersionSchema = z.object({
  label: z.string().trim().min(1).max(50),
});
export type UpdateTermsVersionDto = z.infer<typeof UpdateTermsVersionSchema>;

// Pour le path param `:locale` ; redéfinition explicite pour pouvoir piper la
// validation au niveau du @Param() côté controller.
export const LocaleParamSchema = z.object({
  locale: localeSchema,
});
export type LocaleParam = z.infer<typeof LocaleParamSchema>;

export const UpsertLocaleBodySchema = z.object({
  body: z.string().min(1).max(100_000), // 100 KB de markdown max, généreux
});
export type UpsertLocaleBodyDto = z.infer<typeof UpsertLocaleBodySchema>;
