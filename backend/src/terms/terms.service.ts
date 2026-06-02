import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { loadEnv } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';

export interface ActiveTermsForUser {
  id: string;
  label: string;
  /** Locale effectivement servie (peut différer de la demande après fallback). */
  locale: string;
  body: string;
  availableLocales: string[];
  updatedAt: Date;
}

export interface TermsStatus {
  activeVersionId: string | null;
  accepted: boolean;
  acceptedAt: Date | null;
}

export interface AdminTermsListItem {
  id: string;
  label: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  acceptanceCount: number;
  locales: string[];
}

export interface AdminTermsDetail extends AdminTermsListItem {
  bodies: Array<{ locale: string; body: string; updatedAt: Date }>;
}

/**
 * Code d'erreur stable pour le front : permet d'identifier précisément le cas
 * "user n'a pas accepté la version active" et d'afficher le dialog adapté.
 */
export class TermsNotAcceptedException extends HttpException {
  constructor(activeVersionId: string, label: string) {
    super(
      { code: 'terms_not_accepted', activeVersionId, label, message: 'Terms not accepted' },
      HttpStatus.BAD_REQUEST,
    );
  }
}

@Injectable()
export class TermsService {
  private readonly logger = new Logger(TermsService.name);
  private readonly env = loadEnv();

  constructor(private readonly prisma: PrismaService) {}

  // ─── User / public ──────────────────────────────────────────────────────

  async getActive(requestedLocale?: string): Promise<ActiveTermsForUser | null> {
    const version = await this.prisma.termsVersion.findFirst({
      where: { isActive: true },
      include: {
        locales: {
          select: { locale: true, body: true, updatedAt: true },
        },
      },
    });
    if (!version) return null;
    if (version.locales.length === 0) return null;

    const availableLocales = version.locales.map((l) => l.locale).sort();
    const chosen = this.pickLocale(version.locales, requestedLocale);
    if (!chosen) return null; // ne devrait pas arriver vu le check >0 ci-dessus

    return {
      id: version.id,
      label: version.label,
      locale: chosen.locale,
      body: chosen.body,
      availableLocales,
      updatedAt: chosen.updatedAt,
    };
  }

  async getStatusFor(userId: string): Promise<TermsStatus> {
    const active = await this.prisma.termsVersion.findFirst({
      where: { isActive: true },
      select: { id: true },
    });
    if (!active) {
      return { activeVersionId: null, accepted: false, acceptedAt: null };
    }
    const acceptance = await this.prisma.userTermsAcceptance.findUnique({
      where: { userId_termsVersionId: { userId, termsVersionId: active.id } },
      select: { acceptedAt: true },
    });
    return {
      activeVersionId: active.id,
      accepted: acceptance !== null,
      acceptedAt: acceptance?.acceptedAt ?? null,
    };
  }

  async accept(userId: string, termsVersionId: string, ip: string | null): Promise<void> {
    const version = await this.prisma.termsVersion.findUnique({
      where: { id: termsVersionId },
      select: { isActive: true },
    });
    if (!version) throw new NotFoundException('Terms version not found');
    if (!version.isActive) {
      throw new BadRequestException({
        code: 'terms_version_not_active',
        message: 'Only the currently active terms version can be accepted',
      });
    }
    try {
      await this.prisma.userTermsAcceptance.create({
        data: { userId, termsVersionId, ip },
      });
    } catch (err) {
      // P2002 = unique violation : déjà accepté, on traite comme idempotent.
      if ((err as { code?: string }).code !== 'P2002') throw err;
    }
  }

  /**
   * Garde-fou utilisé en amont de Stripe Checkout. Si aucune version active,
   * pas de gating (rétrocompat) — sinon exige une row d'acceptation.
   */
  async requireAcceptedFor(userId: string): Promise<void> {
    const active = await this.prisma.termsVersion.findFirst({
      where: { isActive: true },
      select: { id: true, label: true },
    });
    if (!active) return;
    const acceptance = await this.prisma.userTermsAcceptance.findUnique({
      where: { userId_termsVersionId: { userId, termsVersionId: active.id } },
      select: { acceptedAt: true },
    });
    if (!acceptance) {
      throw new TermsNotAcceptedException(active.id, active.label);
    }
  }

  // ─── Admin ──────────────────────────────────────────────────────────────

  async listVersions(): Promise<AdminTermsListItem[]> {
    const versions = await this.prisma.termsVersion.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        locales: { select: { locale: true } },
        _count: { select: { acceptances: true } },
      },
    });
    return versions.map((v) => ({
      id: v.id,
      label: v.label,
      isActive: v.isActive,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
      acceptanceCount: v._count.acceptances,
      locales: v.locales.map((l) => l.locale).sort(),
    }));
  }

  async getVersionDetail(id: string): Promise<AdminTermsDetail> {
    const v = await this.prisma.termsVersion.findUnique({
      where: { id },
      include: {
        locales: { select: { locale: true, body: true, updatedAt: true } },
        _count: { select: { acceptances: true } },
      },
    });
    if (!v) throw new NotFoundException('Terms version not found');
    return {
      id: v.id,
      label: v.label,
      isActive: v.isActive,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
      acceptanceCount: v._count.acceptances,
      locales: v.locales.map((l) => l.locale).sort(),
      bodies: v.locales
        .slice()
        .sort((a, b) => a.locale.localeCompare(b.locale))
        .map((l) => ({ locale: l.locale, body: l.body, updatedAt: l.updatedAt })),
    };
  }

  async createVersion(label: string, actorId: string, ip: string | null): Promise<{ id: string }> {
    try {
      const created = await this.prisma.termsVersion.create({
        data: { label, createdBy: actorId },
        select: { id: true },
      });
      await this.prisma.auditLog.create({
        data: {
          userId: actorId,
          action: 'admin.terms.create',
          ip,
          metadata: { versionId: created.id, label },
        },
      });
      return { id: created.id };
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        throw new ConflictException('A terms version with this label already exists');
      }
      throw err;
    }
  }

  async renameVersion(
    id: string,
    label: string,
    actorId: string,
    ip: string | null,
  ): Promise<void> {
    const before = await this.prisma.termsVersion.findUnique({
      where: { id },
      select: { label: true },
    });
    if (!before) throw new NotFoundException('Terms version not found');
    if (before.label === label) return;
    try {
      await this.prisma.$transaction([
        this.prisma.termsVersion.update({ where: { id }, data: { label } }),
        this.prisma.auditLog.create({
          data: {
            userId: actorId,
            action: 'admin.terms.rename',
            ip,
            metadata: { versionId: id, from: before.label, to: label },
          },
        }),
      ]);
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        throw new ConflictException('A terms version with this label already exists');
      }
      throw err;
    }
  }

  async activateVersion(id: string, actorId: string, ip: string | null): Promise<void> {
    const v = await this.prisma.termsVersion.findUnique({
      where: { id },
      include: { _count: { select: { locales: true } } },
    });
    if (!v) throw new NotFoundException('Terms version not found');
    if (v._count.locales === 0) {
      throw new BadRequestException({
        code: 'cannot_activate_no_locale',
        message: 'Cannot activate a terms version with no locales defined',
      });
    }
    await this.prisma.$transaction([
      this.prisma.termsVersion.updateMany({
        where: { isActive: true, NOT: { id } },
        data: { isActive: false },
      }),
      this.prisma.termsVersion.update({
        where: { id },
        data: { isActive: true },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: actorId,
          action: 'admin.terms.activate',
          ip,
          metadata: { versionId: id, label: v.label },
        },
      }),
    ]);
  }

  async deleteVersion(id: string, actorId: string, ip: string | null): Promise<void> {
    const v = await this.prisma.termsVersion.findUnique({
      where: { id },
      include: { _count: { select: { acceptances: true } } },
    });
    if (!v) throw new NotFoundException('Terms version not found');
    if (v._count.acceptances > 0) {
      throw new BadRequestException({
        code: 'cannot_delete_accepted',
        message: 'Cannot delete a terms version with user acceptances',
      });
    }
    await this.prisma.$transaction([
      // Cascade DB supprime les locales automatiquement (onDelete: Cascade).
      this.prisma.termsVersion.delete({ where: { id } }),
      this.prisma.auditLog.create({
        data: {
          userId: actorId,
          action: 'admin.terms.delete',
          ip,
          metadata: { versionId: id, label: v.label },
        },
      }),
    ]);
  }

  async upsertLocale(
    versionId: string,
    locale: string,
    body: string,
    actorId: string,
    ip: string | null,
  ): Promise<void> {
    const version = await this.prisma.termsVersion.findUnique({
      where: { id: versionId },
      select: { id: true },
    });
    if (!version) throw new NotFoundException('Terms version not found');

    const existing = await this.prisma.termsVersionLocale.findUnique({
      where: { termsVersionId_locale: { termsVersionId: versionId, locale } },
      select: { id: true },
    });
    const hadBody = existing !== null;

    await this.prisma.$transaction([
      this.prisma.termsVersionLocale.upsert({
        where: { termsVersionId_locale: { termsVersionId: versionId, locale } },
        create: { termsVersionId: versionId, locale, body },
        update: { body },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: actorId,
          action: 'admin.terms.locale.upsert',
          ip,
          metadata: { versionId, locale, hadBody },
        },
      }),
    ]);
  }

  async deleteLocale(
    versionId: string,
    locale: string,
    actorId: string,
    ip: string | null,
  ): Promise<void> {
    const version = await this.prisma.termsVersion.findUnique({
      where: { id: versionId },
      include: { _count: { select: { locales: true } } },
    });
    if (!version) throw new NotFoundException('Terms version not found');
    if (version._count.locales <= 1) {
      throw new BadRequestException({
        code: 'cannot_delete_last_locale',
        message: 'Cannot delete the last remaining locale of a terms version',
      });
    }
    const existing = await this.prisma.termsVersionLocale.findUnique({
      where: { termsVersionId_locale: { termsVersionId: versionId, locale } },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Locale not found for this version');

    await this.prisma.$transaction([
      this.prisma.termsVersionLocale.delete({
        where: { termsVersionId_locale: { termsVersionId: versionId, locale } },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: actorId,
          action: 'admin.terms.locale.delete',
          ip,
          metadata: { versionId, locale },
        },
      }),
    ]);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  /**
   * Sélectionne la meilleure locale parmi celles disponibles pour cette version :
   *   1. Match exact sur la locale demandée
   *   2. Si la locale demandée a un suffixe région (fr-BE), tente la langue de base (fr)
   *   3. Sinon fallback global configurable (TERMS_FALLBACK_LOCALE, default 'fr')
   *   4. Sinon première disponible, déterministe par ordre alphabétique
   */
  private pickLocale(
    locales: Array<{ locale: string; body: string; updatedAt: Date }>,
    requested?: string,
  ): { locale: string; body: string; updatedAt: Date } | null {
    if (locales.length === 0) return null;

    if (requested) {
      const exact = locales.find((l) => l.locale === requested);
      if (exact) return exact;
      // Suffixe région ? Tente la langue de base.
      const dash = requested.indexOf('-');
      if (dash > 0) {
        const base = requested.slice(0, dash);
        const baseMatch = locales.find((l) => l.locale === base);
        if (baseMatch) return baseMatch;
      }
    }

    const fallback = this.env.TERMS_FALLBACK_LOCALE;
    const fallbackMatch = locales.find((l) => l.locale === fallback);
    if (fallbackMatch) return fallbackMatch;

    // Dernier recours : ordre alphabétique pour déterminisme.
    return locales.slice().sort((a, b) => a.locale.localeCompare(b.locale))[0];
  }
}
