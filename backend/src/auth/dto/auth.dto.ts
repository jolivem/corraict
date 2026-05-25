import { z } from 'zod';

export const RequestCodeSchema = z.object({
  email: z.string().email().max(255).transform((v) => v.toLowerCase().trim()),
  locale: z.enum(['fr', 'en']).optional(),
});
export type RequestCodeDto = z.infer<typeof RequestCodeSchema>;

export const VerifyCodeSchema = z.object({
  email: z.string().email().max(255).transform((v) => v.toLowerCase().trim()),
  code: z.string().regex(/^\d{4,10}$/, 'Code must be 4-10 digits'),
});
export type VerifyCodeDto = z.infer<typeof VerifyCodeSchema>;

export const CreateTokenSchema = z.object({
  label: z.string().min(1).max(100),
});
export type CreateTokenDto = z.infer<typeof CreateTokenSchema>;
