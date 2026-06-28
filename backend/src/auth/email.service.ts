import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { loadEnv } from '../config/env';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly env = loadEnv();
  private readonly resend: Resend | null = this.env.RESEND_API_KEY
    ? new Resend(this.env.RESEND_API_KEY)
    : null;

  async sendAuthCode(email: string, code: string, locale: 'fr' | 'en' = 'fr'): Promise<void> {
    const subject =
      locale === 'en' ? 'Your Plume-AiCorrect verification code' : 'Votre code de connexion Plume-AiCorrect';
    const intro =
      locale === 'en'
        ? `Use this code to sign in to Plume-AiCorrect:`
        : `Utilisez ce code pour vous connecter à Plume-AiCorrect :`;
    const note =
      locale === 'en'
        ? `This code expires in ${Math.round(this.env.AUTH_CODE_TTL_SECONDS / 60)} minutes. If you did not request it, ignore this email.`
        : `Ce code expire dans ${Math.round(this.env.AUTH_CODE_TTL_SECONDS / 60)} minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.`;

    if (!this.resend) {
      // Dev fallback: log the code so the developer can sign in without a Resend account.
      this.logger.warn(
        `[DEV email fallback] RESEND_API_KEY not set — code for ${email} is: ${code}`,
      );
      return;
    }

    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #111;">Plume-AiCorrect</h2>
        <p>${intro}</p>
        <p style="font-size: 32px; font-weight: 700; letter-spacing: 6px; text-align: center; background: #f4f4f5; padding: 16px; border-radius: 8px;">
          ${code}
        </p>
        <p style="color: #555; font-size: 14px;">${note}</p>
      </div>
    `;

    const result = await this.resend.emails.send({
      from: this.env.EMAIL_FROM,
      to: email,
      subject,
      html,
    });

    if (result.error) {
      this.logger.error(`Failed to send auth code to ${email}: ${result.error.message}`);
      throw new Error('Email delivery failed');
    }
  }
}
