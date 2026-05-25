import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { loadEnv } from '../config/env';
import { UsageService } from '../usage/usage.service';
import { buildCorrectionPrompt } from './prompt';
import { MistralClient } from './mistral.client';

export interface CorrectArgs {
  text: string;
  language: 'fr' | 'en';
  model?: string;
  userId: string;
  apiTokenId: string | null;
}

@Injectable()
export class CorrectService {
  private readonly logger = new Logger(CorrectService.name);
  private readonly env = loadEnv();

  constructor(
    private readonly mistral: MistralClient,
    private readonly usage: UsageService,
  ) {}

  async correct(args: CorrectArgs): Promise<{ corrected: string; model: string; latencyMs: number }> {
    const model = args.model ?? this.env.CORRECT_DEFAULT_MODEL;
    const wordsIn = this.countWords(args.text);
    const charsIn = args.text.length;
    const systemPrompt = buildCorrectionPrompt(args.language);
    const startedAt = Date.now();

    const result = await this.mistral.chat({ model, systemPrompt, userText: args.text });
    const latencyMs = Date.now() - startedAt;

    await this.usage.record({
      userId: args.userId,
      apiTokenId: args.apiTokenId,
      wordsIn,
      charsIn,
      model,
      latencyMs,
      success: result.ok,
      httpStatus: result.httpStatus,
    });

    if (!result.ok || !result.content) {
      throw new BadGatewayException({
        message: 'correction_unavailable',
        reason: result.errorReason ?? 'unknown',
      });
    }

    return { corrected: result.content, model, latencyMs };
  }

  private countWords(text: string): number {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/u).length;
  }
}
