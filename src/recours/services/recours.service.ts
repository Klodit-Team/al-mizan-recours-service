import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { StatutRecours } from '@prisma/client';
import { RecoursRepository } from '../repositories/recours.repository';
import { ReferenceGeneratorService } from './reference-generator.service';
import { DelaiValidatorService } from './delai-validator.service';
import { StatutTransitionService } from './statut-transition.service';
import { RecoursEventPublisher } from '../events/recours-event.publisher';
import { CreateRecoursDto } from '../dto/create-recours.dto';
import { FilterRecoursDto, ExaminerRecoursDto, StatuerRecoursDto } from '../dto/index';
import { UpdateRecoursDto } from '../dto/index';
import {
  RecoursNotFoundException,
  ExamenExistantException,
  RecoursDejaDecideException,
} from '../../common/exceptions/recours.exceptions';
import { PaginatedRecoursEntity, RecoursEntity } from '../entities/recours.entity';

/**
 * Service principal orchestrant la logique métier du recours.
 * OCP: extensible via injection de dépendances (repository, validators, events).
 * DIP: dépend d'abstractions (interfaces, DTOs) et non d'implémentations concrètes.
 */
@Injectable()
export class RecoursService {
  private readonly logger = new Logger(RecoursService.name);

  constructor(
    private readonly repository: RecoursRepository,
    private readonly referenceGenerator: ReferenceGeneratorService,
    private readonly delaiValidator: DelaiValidatorService,
    private readonly statutTransition: StatutTransitionService,
    private readonly eventPublisher: RecoursEventPublisher,
  ) {}

  // ── US #1: Déposer un recours ─────────────────────────────────────────
  /**
   * Dépose un recours dans le délai légal (Art. 82 Loi 23-12).
   * Le délai de dépôt est de 10 jours après notification de l'attribution provisoire.
   * Ici on utilise la date courante comme dateDepot (horodatage serveur).
   */
  async deposer(dto: CreateRecoursDto, acteurId: string): Promise<RecoursEntity> {
    void acteurId; // paramètre réservé pour audit futur
    const now = new Date();
    const dateLimiteReponse = this.delaiValidator.calculerDateLimiteReponse(now);
    const reference = await this.referenceGenerator.generate();

    const recours = await this.repository.create({
      ...dto,
      reference,
      dateDepot: now,
      dateLimiteReponse,
      piecesJointesUrls: dto.piecesJointesUrls ?? [],
    });

    // Créer l'historique initial
    await this.repository.createHistorique({
      recoursId: recours.id,
      ancienStatut: undefined,
      nouveauStatut: StatutRecours.DEPOSE,
      acteurId: dto.operateurId,
      commentaire: 'Dépôt initial du recours',
    });

    // Publier l'événement (asynchrone – non bloquant)
    this.eventPublisher.publishRecoursDepose({
      id: recours.id,
      appelOffreId: recours.appelOffreId,
      operateurId: recours.operateurId,
      reference: recours.reference,
    });

    this.logger.log(`Recours déposé: ${recours.reference} | AO: ${recours.appelOffreId}`);

    return recours as RecoursEntity;
  }

  // ── US #2: Examiner un recours ────────────────────────────────────────
  /**
   * Lance l'examen d'un recours (Art. 84 – Commission des marchés).
   * Passe le statut de DEPOSE → EN_EXAMEN.
   */
  async examiner(id: string, dto: ExaminerRecoursDto, acteurId: string): Promise<RecoursEntity> {
    const recours = await this.findOrFail(id);

    // Vérifier qu'il n'y a pas déjà un examen
    const examenExistant = await this.repository.findExamenByRecoursId(id);
    if (examenExistant) {
      throw new ExamenExistantException(id);
    }

    // Valider la transition de statut
    this.statutTransition.validateTransition(recours.statut, StatutRecours.EN_EXAMEN);

    // Transaction: mise à jour statut + création examen + historique
    await Promise.all([
      this.repository.updateStatut(id, StatutRecours.EN_EXAMEN),
      this.repository.createExamen({
        recoursId: id,
        examinateurId: dto.examinateurId,
        notes: dto.notes,
        recommandation: dto.recommandation,
      }),
      this.repository.createHistorique({
        recoursId: id,
        ancienStatut: recours.statut,
        nouveauStatut: StatutRecours.EN_EXAMEN,
        acteurId,
        commentaire: `Examen ouvert par: ${dto.examinateurId}`,
      }),
    ]);

    this.eventPublisher.publishStatutChange({ ...recours, statut: 'EN_EXAMEN' });

    return this.findByIdWithRelations(id);
  }

  // ── US #3: Statuer sur un recours ─────────────────────────────────────
  /**
   * Prononce la décision finale sur un recours (ACCEPTE ou REJETE).
   * Art. 83: délai de réponse de la commission = 10 jours.
   */
  async statuer(id: string, dto: StatuerRecoursDto, acteurId: string): Promise<RecoursEntity> {
    const recours = await this.findOrFail(id);

    // Vérifier que le recours n'est pas déjà décidé
    if (this.statutTransition.isEtatFinal(recours.statut)) {
      throw new RecoursDejaDecideException(id, recours.statut);
    }

    const nouveauStatut = dto.decision as unknown as StatutRecours;

    // Valider la transition
    this.statutTransition.validateTransition(recours.statut, nouveauStatut);

    // Mise à jour atomique
    await Promise.all([
      this.repository.update(id, {
        statut: nouveauStatut,
        decision: dto.decision,
        motifDecision: dto.motifDecision,
        dateDecision: new Date(),
      }),
      this.repository.createHistorique({
        recoursId: id,
        ancienStatut: recours.statut,
        nouveauStatut,
        acteurId,
        commentaire: dto.commentaire ?? `Décision: ${dto.decision}`,
      }),
    ]);

    this.eventPublisher.publishStatutChange({
      ...recours,
      statut: nouveauStatut,
      decision: dto.decision,
    });

    this.logger.log(`Recours ${recours.reference} → ${nouveauStatut} | acteur: ${acteurId}`);

    return this.findByIdWithRelations(id);
  }

  // ── US #4: Mettre à jour un recours (avant soumission) ────────────────
  async modifier(id: string, dto: UpdateRecoursDto, acteurId: string): Promise<RecoursEntity> {
    void acteurId; // paramètre réservé pour audit futur
    const recours = await this.findOrFail(id);

    // Seul l'opérateur propriétaire peut modifier, et seulement à l'état DEPOSE
    if (recours.statut !== StatutRecours.DEPOSE) {
      throw new ForbiddenException(
        "Modification impossible: le recours n'est plus à l'état DEPOSE",
      );
    }

    await this.repository.update(id, {
      motif: dto.motif,
      piecesJointesUrls: dto.piecesJointesUrls,
    });

    return this.findByIdWithRelations(id);
  }

  // ── Consultation ──────────────────────────────────────────────────────

  async findAll(filters: FilterRecoursDto): Promise<PaginatedRecoursEntity> {
    const { data, total } = await this.repository.findAll(filters);
    const { page = 1, limit = 20 } = filters;

    return {
      data: data as RecoursEntity[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByOperateur(
    operateurId: string,
    filters: FilterRecoursDto,
  ): Promise<PaginatedRecoursEntity> {
    const { data, total } = await this.repository.findByOperateur(operateurId, filters);
    const { page = 1, limit = 20 } = filters;

    return {
      data: data as RecoursEntity[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByIdWithRelations(id: string): Promise<RecoursEntity> {
    const recours = await this.repository.findByIdWithRelations(id);
    if (!recours) throw new RecoursNotFoundException(id);
    return recours as RecoursEntity;
  }

  async findByAppelOffre(appelOffreId: string): Promise<RecoursEntity[]> {
    const recours = await this.repository.findByAppelOffre(appelOffreId);
    return recours as RecoursEntity[];
  }

  // ── US #5: Vérification automatique des délais ───────────────────────
  /**
   * Tâche planifiable pour détecter les délais expirés.
   * Peut être appelée par un scheduler ou un worker externe.
   */
  async verifierDelaisExpires(): Promise<{ count: number; ids: string[] }> {
    const recours = await this.repository.findDelaisExpires();

    const ids = recours.map((r) => r.id);
    if (ids.length > 0) {
      this.logger.warn(`${ids.length} recours avec délai dépassé: ${ids.join(', ')}`);
    }

    return { count: ids.length, ids };
  }

  async getStatistiques(): Promise<Record<StatutRecours, number>> {
    return this.repository.countByStatut();
  }

  // ── Helper privé ─────────────────────────────────────────────────────

  private async findOrFail(id: string) {
    const recours = await this.repository.findById(id);
    if (!recours) throw new RecoursNotFoundException(id);
    return recours;
  }
}
