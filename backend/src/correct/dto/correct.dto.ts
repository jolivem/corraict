import { z } from 'zod';
import { loadEnv } from '../../config/env';

const maxChars = loadEnv().CORRECT_MAX_INPUT_CHARS;

export const CorrectSchema = z.object({
  text: z.string().min(1, 'text is required').max(maxChars, `text exceeds ${maxChars} characters`),
  language: z.enum(['fr', 'en']).default('fr'),
  model: z.string().min(1).max(80).optional(),
});
export type CorrectDto = z.infer<typeof CorrectSchema>;
