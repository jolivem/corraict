import { z } from 'zod';
import { loadEnv } from '../../config/env';

const maxChars = loadEnv().CORRECT_MAX_INPUT_CHARS;

export const CorrectSchema = z.object({
  text: z.string().min(1, 'text is required').max(maxChars, `text exceeds ${maxChars} characters`),
  language: z.enum(['fr', 'en']).default('fr'),
  model: z.string().min(1).max(80).optional(),
  // BCP 47 locale tag transmis par le client (ex. "fr-FR", "en-US").
  // Non utilisé aujourd'hui — gardé pour de futures features (templates de
  // prompts région-spécifiques, métriques par marché, etc.). Validé en
  // longueur uniquement pour éviter le bruit dans les logs.
  locale: z.string().max(35).optional(),
});
export type CorrectDto = z.infer<typeof CorrectSchema>;
