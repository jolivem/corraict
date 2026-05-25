import { z } from 'zod';

export const CreateCheckoutSchema = z.object({
  successPath: z.string().startsWith('/').max(200).optional(),
  cancelPath: z.string().startsWith('/').max(200).optional(),
});
export type CreateCheckoutDto = z.infer<typeof CreateCheckoutSchema>;

export const CreatePortalSchema = z.object({
  returnPath: z.string().startsWith('/').max(200).optional(),
});
export type CreatePortalDto = z.infer<typeof CreatePortalSchema>;
