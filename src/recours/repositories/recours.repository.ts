import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Recours, StatutRecours, Prisma } from '@prisma/client';
import {
  IRecoursRepository,
  CreateRecoursData,
  UpdateRecoursData,
} from '../interfaces/recours-repository.interface';
import { FilterRecoursDto } from '../dto/index';

@Injectable()
export class RecoursRepository implements IRecoursRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Recours | null> {
    return this.prisma.recours.findUnique({ where: { id } });
  }

  async findByIdWithRelations(id: string): Promise<unknown> {
    return this.prisma.recours.findUnique({
      where: { id },
      include: {
        examen: true,
        historique: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async findAll(filters: FilterRecoursDto): Promise<{ data: Recours[]; total: number }> {
    const where = this.buildWhereClause(filters);
    const { page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.recours.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dateDepot: 'desc' },
        include: { examen: true },
      }),
      this.prisma.recours.count({ where }),
    ]);

    return { data, total };
  }

  async findByOperateur(
    operateurId: string,
    filters: FilterRecoursDto,
  ): Promise<{ data: Recours[]; total: number }> {
    return this.findAll({ ...filters, operateurId });
  }

  async findByAppelOffre(appelOffreId: string): Promise<Recours[]> {
    return this.prisma.recours.findMany({
      where: { appelOffreId },
      orderBy: { dateDepot: 'desc' },
    });
  }

  async create(data: CreateRecoursData): Promise<Recours> {
    return this.prisma.recours.create({
      data: {
        appelOffreId: data.appelOffreId,
        operateurId: data.operateurId,
        attributionProvisoireId: data.attributionProvisoireId,
        reference: data.reference,
        motif: data.motif,
        piecesJointesUrls: (data.piecesJointesUrls ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        dateDepot: data.dateDepot,
        dateLimiteReponse: data.dateLimiteReponse,
      },
    });
  }

  async update(id: string, data: UpdateRecoursData): Promise<Recours> {
    const updateData: Prisma.RecoursUpdateInput = {};

    if (data.motif !== undefined) updateData.motif = data.motif;
    if (data.piecesJointesUrls !== undefined)
      updateData.piecesJointesUrls = data.piecesJointesUrls as Prisma.InputJsonValue;
    if (data.statut !== undefined) updateData.statut = data.statut;
    if (data.decision !== undefined) updateData.decision = data.decision;
    if (data.motifDecision !== undefined) updateData.motifDecision = data.motifDecision;
    if (data.dateDecision !== undefined) updateData.dateDecision = data.dateDecision;

    return this.prisma.recours.update({ where: { id }, data: updateData });
  }

  async updateStatut(id: string, statut: StatutRecours): Promise<Recours> {
    return this.prisma.recours.update({
      where: { id },
      data: { statut },
    });
  }

  async findDelaisExpires(): Promise<Recours[]> {
    return this.prisma.recours.findMany({
      where: {
        statut: { in: [StatutRecours.DEPOSE, StatutRecours.EN_EXAMEN] },
        dateLimiteReponse: { lt: new Date() },
      },
    });
  }

  async countByStatut(): Promise<Record<StatutRecours, number>> {
    const counts = await this.prisma.recours.groupBy({
      by: ['statut'],
      _count: { statut: true },
    });

    const result = {} as Record<StatutRecours, number>;
    Object.values(StatutRecours).forEach((s) => (result[s] = 0));
    counts.forEach((c) => (result[c.statut] = c._count.statut));

    return result;
  }

  // ── Examen ────────────────────────────────

  async createExamen(data: {
    recoursId: string;
    examinateurId: string;
    notes?: string;
    recommandation?: string;
  }) {
    return this.prisma.examenRecours.create({
      data: {
        recoursId: data.recoursId,
        examinateurId: data.examinateurId,
        notes: data.notes,
        recommandation: data.recommandation,
        dateExamen: new Date(),
      },
    });
  }

  async findExamenByRecoursId(recoursId: string) {
    return this.prisma.examenRecours.findUnique({ where: { recoursId } });
  }

  // ── Historique ────────────────────────────

  async createHistorique(data: {
    recoursId: string;
    ancienStatut?: StatutRecours;
    nouveauStatut: StatutRecours;
    acteurId: string;
    commentaire?: string;
  }) {
    return this.prisma.historiqueStatut.create({ data });
  }

  async findHistoriqueByRecoursId(recoursId: string) {
    return this.prisma.historiqueStatut.findMany({
      where: { recoursId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── Helpers ───────────────────────────────

  private buildWhereClause(filters: FilterRecoursDto): Prisma.RecoursWhereInput {
    const where: Prisma.RecoursWhereInput = {};

    if (filters.statut) where.statut = filters.statut;
    if (filters.appelOffreId) where.appelOffreId = filters.appelOffreId;
    if (filters.operateurId) where.operateurId = filters.operateurId;

    if (filters.dateDebut || filters.dateFin) {
      where.dateDepot = {};
      if (filters.dateDebut) where.dateDepot.gte = new Date(filters.dateDebut);
      if (filters.dateFin) where.dateDepot.lte = new Date(filters.dateFin);
    }

    return where;
  }
}
