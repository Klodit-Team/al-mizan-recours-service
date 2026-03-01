import { Recours, StatutRecours } from '@prisma/client';
import { FilterRecoursDto } from '../dto/index';

export interface IRecoursRepository {
  findById(id: string): Promise<Recours | null>;
  findByIdWithRelations(id: string): Promise<unknown>;
  findAll(filters: FilterRecoursDto): Promise<{ data: Recours[]; total: number }>;
  findByOperateur(
    operateurId: string,
    filters: FilterRecoursDto,
  ): Promise<{ data: Recours[]; total: number }>;
  findByAppelOffre(appelOffreId: string): Promise<Recours[]>;
  create(data: CreateRecoursData): Promise<Recours>;
  update(id: string, data: UpdateRecoursData): Promise<Recours>;
  updateStatut(id: string, statut: StatutRecours): Promise<Recours>;
  findDelaisExpires(): Promise<Recours[]>;
  countByStatut(): Promise<Record<StatutRecours, number>>;
}

export interface CreateRecoursData {
  appelOffreId: string;
  operateurId: string;
  attributionProvisoireId: string;
  reference: string;
  motif: string;
  piecesJointesUrls?: string[];
  dateDepot: Date;
  dateLimiteReponse: Date;
}

export interface UpdateRecoursData {
  motif?: string;
  piecesJointesUrls?: string[];
  statut?: StatutRecours;
  decision?: string;
  motifDecision?: string;
  dateDecision?: Date;
}

export const RECOURS_REPOSITORY = 'RECOURS_REPOSITORY';
