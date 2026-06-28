import { z } from 'zod';

export const CreateCheckoutSchema = z.object({
  successPath: z.string().startsWith('/').max(200).optional(),
  cancelPath: z.string().startsWith('/').max(200).optional(),
});
export type CreateCheckoutDto = z.infer<typeof CreateCheckoutSchema>;

export const CreatePortalSchema = z.object({
  returnPath: z.string().startsWith('/').max(200).optional(),
  // 'cancel' ouvre le portail Stripe directement sur l'écran de résiliation
  // (flow_data.subscription_cancel) au lieu de la page de gestion générique.
  flow: z.enum(['cancel']).optional(),
});
export type CreatePortalDto = z.infer<typeof CreatePortalSchema>;
