export interface MeDto {
  userId: string;
  email?: string;
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
