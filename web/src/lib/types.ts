export type UserRole = 'USER' | 'ADMIN';
export type UserPlan = 'FREE' | 'PRO';

export interface MeDto {
  userId: string;
  email?: string;
  role?: UserRole;
  plan?: UserPlan;
  locale?: string;
  /** null = illimité (ADMIN). Sinon override par-user ou défaut env. */
  effectiveQuota?: number | null;
}

export interface AdminUserListItem {
  id: string;
  email: string;
  role: UserRole;
  plan: UserPlan;
  monthlyRequestQuota: number | null;
  suspendedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  requestsThisMonth: number;
  hasActiveSubscription: boolean;
}

export interface AdminUserListResponse {
  items: AdminUserListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface UsageRetentionStats {
  totalEvents: number;
  oldestTs: string | null;
  retentionDays: number;
  lastPurgeTs: string | null;
  lastPurgeDeleted: number | null;
}

export interface AdminUserDetail extends AdminUserListItem {
  locale: string;
  stripeCustomerId: string | null;
  effectiveQuota: number | null;
  usageMonthly: Array<{ yearMonth: string; requests: number; words: number }>;
  subscriptions: Array<{
    id: string;
    stripeSubId: string;
    plan: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAt: string | null;
    canceledAt: string | null;
  }>;
  recentAuditLogs: Array<{
    id: string;
    action: string;
    ip: string | null;
    ts: string;
    metadata: unknown;
  }>;
}

export interface UsageMonth {
  yearMonth: string;
  requests: number;
  words: number;
}

export interface UsageSummary {
  currentMonth: UsageMonth;
  recentMonths: UsageMonth[];
}

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid'
  | 'paused';

export interface SubscriptionDto {
  plan: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEnd: string | null;
  cancelAt: string | null;
  canceledAt: string | null;
}

export interface PaymentMethodDto {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export interface SubscriptionPayload {
  subscription: SubscriptionDto | null;
  paymentMethods: PaymentMethodDto[];
}

export interface InvoiceDto {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  paidAt: string | null;
  pdfUrl: string | null;
  hostedUrl: string | null;
}

export interface ApiTokenDto {
  id: string;
  label: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface NewTokenResponse {
  id: string;
  token: string;
  label: string;
  createdAt: string;
}
