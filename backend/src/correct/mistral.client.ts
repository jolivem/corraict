import { Injectable, Logger } from '@nestjs/common';
import { loadEnv } from '../config/env';

export interface MistralCallResult {
  ok: boolean;
  httpStatus: number;
  content?: string;
  errorReason?: string;
}

interface MistralResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

@Injectable()
export class MistralClient {
  private readonly logger = new Logger(MistralClient.name);
  private readonly env = loadEnv();

  async chat(args: {
    model: string;
    systemPrompt: string;
    userText: string;
  }): Promise<MistralCallResult> {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), this.env.MISTRAL_TIMEOUT_MS);

    try {
      const res = await fetch(this.env.MISTRAL_API_URL, {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          Authorization: `Bearer ${this.env.MISTRAL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: args.model,
          temperature: 0,
          messages: [
            { role: 'system', content: args.systemPrompt },
            { role: 'user', content: args.userText },
          ],
        }),
      });

      if (!res.ok) {
        const raw = await res.text().catch(() => '');
        this.logger.warn(`Mistral HTTP ${res.status}: ${raw.slice(0, 200)}`);
        return { ok: false, httpStatus: res.status, errorReason: `upstream_${res.status}` };
      }

      const json = (await res.json()) as MistralResponse;
      const content = json.choices?.[0]?.message?.content?.trim();
      if (!content) {
        return { ok: false, httpStatus: 502, errorReason: 'empty_choice' };
      }
      return { ok: true, httpStatus: res.status, content };
    } catch (err) {
      const reason = (err as { name?: string }).name === 'AbortError' ? 'timeout' : 'network';
      this.logger.warn(`Mistral call failed (${reason}): ${(err as Error).message}`);
      return { ok: false, httpStatus: 504, errorReason: reason };
    } finally {
      clearTimeout(timeout);
    }
  }
}
