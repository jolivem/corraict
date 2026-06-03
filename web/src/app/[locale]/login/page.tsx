'use client';

import { useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { apiUrl } from '@/lib/api';

type Step = 'request' | 'verify';

export default function LoginPage() {
  const t = useTranslations('Login');
  const tCommon = useTranslations('Common');
  const tFooter = useTranslations('Footer');
  const locale = useLocale();
  const router = useRouter();

  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRequest(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`${apiUrl()}/v1/auth/request-code`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), locale }),
      });
      if (res.status === 204) {
        setStep('verify');
      } else if (res.status === 429) {
        setError(t('errorRateLimit'));
      } else {
        setError(t('errorGeneric'));
      }
    } catch {
      setError(t('errorGeneric'));
    } finally {
      setPending(false);
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`${apiUrl()}/v1/auth/verify-code`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim() }),
      });
      if (res.ok) {
        router.push('/dashboard');
      } else if (res.status === 401) {
        setError(t('errorInvalidCode'));
      } else {
        setError(t('errorGeneric'));
      }
    } catch {
      setError(t('errorGeneric'));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-6 py-16">
      <h1 className="text-2xl font-bold text-ink">{t('title')}</h1>
      <p className="mt-2 text-sm text-muted">{t('subtitle')}</p>

      {step === 'request' ? (
        <form className="mt-8 flex flex-col gap-4" onSubmit={handleRequest}>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-body">{t('emailLabel')}</span>
            <input
              type="email"
              required
              autoComplete="email"
              autoFocus
              value={email}
              placeholder={t('emailPlaceholder')}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-line bg-white px-3 py-2 text-body focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {pending ? tCommon('loading') : t('sendCode')}
          </button>
          <p className="text-xs text-muted">
            {t('consentPrefix')}{' '}
            <Link href="/legal/terms" className="text-brand-700 hover:underline">
              {tFooter('terms').toLowerCase()}
            </Link>{' '}
            {t('consentAnd')}{' '}
            <Link href="/legal/privacy" className="text-brand-700 hover:underline">
              {tFooter('privacy').toLowerCase()}
            </Link>
            .
          </p>
        </form>
      ) : (
        <form className="mt-8 flex flex-col gap-4" onSubmit={handleVerify}>
          <p className="text-sm text-muted">
            <span className="font-medium text-ink">{email}</span>
          </p>
          <p className="text-sm text-muted">{t('codeHint')}</p>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-body">{t('codeLabel')}</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{4,10}"
              required
              autoFocus
              autoComplete="one-time-code"
              value={code}
              placeholder={t('codePlaceholder')}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="rounded-lg border border-line bg-white px-3 py-2 text-lg tracking-widest text-body focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {pending ? tCommon('loading') : t('verify')}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('request');
              setCode('');
              setError(null);
            }}
            className="text-sm text-brand-700 hover:underline"
          >
            {t('changeEmail')}
          </button>
        </form>
      )}
    </div>
  );
}
