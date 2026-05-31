import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { loadEnv } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Promeut au rôle ADMIN les emails listés dans ADMIN_EMAILS (CSV) à chaque boot.
 *
 * Idempotent : ne fait rien si déjà ADMIN. Un user dont l'email est dans la liste
 * doit s'être logué au moins une fois (création du row User par AuthService.verifyCode)
 * avant d'être promu — il suffit alors de redémarrer le backend.
 */
@Injectable()
export class AdminBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AdminBootstrapService.name);
  private readonly env = loadEnv();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    const raw = this.env.ADMIN_EMAILS;
    if (!raw) return;
    const emails = raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0);
    if (emails.length === 0) return;

    try {
      const result = await this.prisma.user.updateMany({
        where: { email: { in: emails }, role: { not: 'ADMIN' } },
        data: { role: 'ADMIN' },
      });
      if (result.count > 0) {
        this.logger.log(`Promoted ${result.count} user(s) to ADMIN from ADMIN_EMAILS`);
      }
    } catch (err) {
      // Ne jamais bloquer le démarrage pour ça.
      this.logger.error('Admin bootstrap failed', err as Error);
    }
  }
}
