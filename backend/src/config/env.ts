import { z } from 'zod';

const optionalSecret = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().min(1).optional(),
);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().min(1),

  MISTRAL_API_KEY: z.string().min(1),

  STRIPE_SECRET_KEY: optionalSecret,
  STRIPE_WEBHOOK_SECRET: optionalSecret,
  STRIPE_PRO_PRICE_ID: optionalSecret,

  RESEND_API_KEY: optionalSecret,
  EMAIL_FROM: z.string().default('AiCorrect <no-reply@aicorrect.app>'),

  PUBLIC_WEB_URL: z.string().url().default('http://localhost:3001'),
  // URL publique de cette API (api.aicorrect.app en prod). Sert à construire
  // le lien de redemption renvoyé à l'app mobile pour la connexion web.
  PUBLIC_API_URL: z.string().url().default('http://localhost:3000'),

  AUTH_CODE_TTL_SECONDS: z.coerce.number().int().positive().default(600),
  AUTH_CODE_LENGTH: z.coerce.number().int().min(4).max(10).default(6),
  AUTH_CODE_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  AUTH_CODE_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(900),
  AUTH_CODE_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),

  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 24 * 30),
  SESSION_COOKIE_NAME: z.string().default('aicorrect_session'),
  SESSION_COOKIE_DOMAIN: optionalSecret,
  // Durée de vie du ticket de connexion web à usage unique (magic-link mobile).
  // Court par sécurité : le temps que l'app ouvre le navigateur.
  WEB_LOGIN_TICKET_TTL_SECONDS: z.coerce.number().int().positive().default(120),

  CORRECT_DEFAULT_MODEL: z.string().default('mistral-small-latest'),
  CORRECT_MAX_INPUT_CHARS: z.coerce.number().int().positive().default(5000),
  MISTRAL_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  MISTRAL_API_URL: z.string().url().default('https://api.mistral.ai/v1/chat/completions'),

  STRIPE_TRIAL_DAYS: z.coerce.number().int().nonnegative().default(15),

  // Bootstrap admin : emails CSV promus au rôle ADMIN au démarrage du backend.
  ADMIN_EMAILS: optionalSecret,
  // Compte de test (revue Google Play / testeurs sans accès à la boîte mail).
  // Si les DEUX sont définis : request-code n'envoie pas d'email pour cet email,
  // et verify-code accepte ce code fixe. Un seul compte, sans privilège.
  TEST_LOGIN_EMAIL: optionalSecret,
  TEST_LOGIN_CODE: optionalSecret,
  // Quota mensuel par défaut pour le tier FREE (en nombre de requêtes /v1/correct).
  // Override par-user possible via User.monthlyRequestQuota.
  FREE_TIER_MONTHLY_QUOTA: z.coerce.number().int().positive().default(50),
  // Durée de conservation des UsageEvent bruts (un row par appel /v1/correct).
  // Au-delà, le cron UsageRetentionService.purge() supprime quotidiennement.
  // Les agrégats UsageMonthly sont conservés indéfiniment.
  USAGE_EVENT_RETENTION_DAYS: z.coerce.number().int().positive().default(180),

  // Locale de fallback pour les CGU si la langue demandée n'a pas de contenu
  // dans la version active. BCP 47 lite (ex. "fr", "en"). Default: fr.
  TERMS_FALLBACK_LOCALE: z.string().min(2).max(8).default('fr'),
});

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | null = null;

export function loadEnv(): AppEnv {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment variables:');
    console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
    process.exit(1);
  }
  cached = parsed.data;
  return cached;
}
