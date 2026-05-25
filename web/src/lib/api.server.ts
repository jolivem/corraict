import 'server-only';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? 'aicorrect_session';

export const serverApiUrl = (): string =>
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

/**
 * Server-side GET that forwards the session cookie from the incoming request.
 * Returns null on any non-2xx — the caller decides whether to redirect to /login
 * or show a placeholder ("billing unavailable", etc.).
 */
export async function serverGet<T>(path: string): Promise<T | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME);
  if (!session) return null;
  try {
    const res = await fetch(`${serverApiUrl()}${path}`, {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${session.value}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
