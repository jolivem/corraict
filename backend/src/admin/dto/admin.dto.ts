import { z } from 'zod';

export const ListUsersQuerySchema = z.object({
  q: z.string().trim().min(1).max(255).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  // 'live' = actifs + suspendus (tout sauf supprimés) — vue par défaut.
  status: z.enum(['all', 'live', 'active', 'suspended', 'deleted']).default('live'),
});
export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>;

export const UpdatePlanSchema = z.object({
  plan: z.enum(['FREE', 'PRO']),
});
export type UpdatePlanDto = z.infer<typeof UpdatePlanSchema>;

export const UpdateQuotaSchema = z.object({
  // null = revenir au quota du tier (env).
  monthlyRequestQuota: z.number().int().min(0).max(1_000_000).nullable(),
});
export type UpdateQuotaDto = z.infer<typeof UpdateQuotaSchema>;
