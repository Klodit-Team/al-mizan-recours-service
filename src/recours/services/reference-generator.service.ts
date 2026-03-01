import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Génère des références uniques et séquentielles pour les recours.
 * Format: REC-YYYY-NNNN (ex: REC-2026-0001)
 */
@Injectable()
export class ReferenceGeneratorService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `REC-${year}-`;

    // Compte les recours de l'année en cours pour le séquençage
    const count = await this.prisma.recours.count({
      where: {
        reference: { startsWith: prefix },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `${prefix}${sequence}`;
  }
}
