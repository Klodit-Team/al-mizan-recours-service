import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { RecoursService } from '../services/recours.service';
import { CreateRecoursDto } from '../dto/create-recours.dto';
import {
  UpdateRecoursDto,
  FilterRecoursDto,
  ExaminerRecoursDto,
  StatuerRecoursDto,
} from '../dto/index';
import { RecoursEntity, PaginatedRecoursEntity } from '../entities/recours.entity';

@ApiTags('recours')
@ApiBearerAuth('session-cookie')
@ApiHeader({
  name: 'x-user-id',
  description: "Identifiant utilisateur injecté par l'API Gateway",
  required: true,
})
@ApiHeader({
  name: 'x-user-roles',
  description: "Rôles utilisateur (JSON array) injectés par l'API Gateway",
  required: true,
})
@Controller('recours')
export class RecoursController {
  constructor(private readonly recoursService: RecoursService) {}

  // ─────────────────────────────────────────────────────────────────────
  // POST /recours – Déposer un recours (Art. 82 Loi 23-12)
  // ─────────────────────────────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Déposer un recours',
    description: `
Permet à un **Opérateur Économique** non retenu de déposer un recours contre
une attribution provisoire dans un délai légal de **10 jours** (Art. 82-83 Loi 23-12).

**Règles métier:**
- Le recours doit être déposé dans les 10 jours suivant la notification.
- Un motif détaillé (min. 50 caractères) est obligatoire.
- Les pièces jointes sont des URLs MinIO pré-signées (max. 10 documents).
- La référence est générée automatiquement (format: REC-YYYY-NNNN).
- L'horodatage serveur fait foi légale.
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Recours déposé avec succès',
    type: RecoursEntity,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 422, description: 'Délai légal de dépôt dépassé' })
  async deposer(
    @Body() dto: CreateRecoursDto,
    @Headers('x-user-id') acteurId: string,
  ): Promise<RecoursEntity> {
    return this.recoursService.deposer(dto, acteurId);
  }

  // ─────────────────────────────────────────────────────────────────────
  // GET /recours – Lister tous les recours (Admins/Commission)
  // ─────────────────────────────────────────────────────────────────────
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lister les recours',
    description: `
Retourne la liste paginée des recours avec filtres optionnels.
Accessible par les rôles: **ADMIN**, **CONTROLEUR**, **COMMISSION_MARCHES**.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Liste paginée des recours',
    type: PaginatedRecoursEntity,
  })
  async findAll(@Query() filters: FilterRecoursDto): Promise<PaginatedRecoursEntity> {
    return this.recoursService.findAll(filters);
  }

  // ─────────────────────────────────────────────────────────────────────
  // GET /recours/statistiques – Statistiques par statut
  // ─────────────────────────────────────────────────────────────────────
  @Get('statistiques')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Statistiques des recours par statut',
    description: 'Retourne le nombre de recours par statut (tableau de bord admin).',
  })
  @ApiResponse({ status: 200, description: 'Compteurs par statut' })
  async getStatistiques() {
    return this.recoursService.getStatistiques();
  }

  // ─────────────────────────────────────────────────────────────────────
  // GET /recours/delais-expires – Recours en dépassement de délai
  // ─────────────────────────────────────────────────────────────────────
  @Get('delais-expires')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Détecter les recours avec délai de réponse expiré',
    description: `
Identifie les recours dont le délai légal de réponse (10 jours, Art. 83) est dépassé.
Utilisé par le scheduler et les contrôleurs pour forcer le traitement.
    `,
  })
  @ApiResponse({ status: 200, description: 'Identifiants des recours en retard' })
  async verifierDelais() {
    return this.recoursService.verifierDelaisExpires();
  }

  // ─────────────────────────────────────────────────────────────────────
  // GET /recours/operateur/:operateurId – Recours d'un opérateur
  // ─────────────────────────────────────────────────────────────────────
  @Get('operateur/:operateurId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Recours d'un opérateur économique",
    description: `
Permet à un **Opérateur Économique** de consulter l'état de ses recours
(DEPOSE, EN_EXAMEN, ACCEPTE, REJETE) – US #4 backlog.
    `,
  })
  @ApiParam({
    name: 'operateurId',
    description: "UUID de l'opérateur économique",
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @ApiResponse({ status: 200, type: PaginatedRecoursEntity })
  @ApiResponse({ status: 400, description: 'UUID invalide' })
  async findByOperateur(
    @Param('operateurId', ParseUUIDPipe) operateurId: string,
    @Query() filters: FilterRecoursDto,
  ): Promise<PaginatedRecoursEntity> {
    return this.recoursService.findByOperateur(operateurId, filters);
  }

  // ─────────────────────────────────────────────────────────────────────
  // GET /recours/appel-offre/:appelOffreId – Recours d'un AO
  // ─────────────────────────────────────────────────────────────────────
  @Get('appel-offre/:appelOffreId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Tous les recours pour un appel d'offres",
    description: "Retourne l'ensemble des recours déposés sur un AO donné.",
  })
  @ApiParam({ name: 'appelOffreId', description: "UUID de l'appel d'offres" })
  @ApiResponse({ status: 200, type: [RecoursEntity] })
  async findByAppelOffre(
    @Param('appelOffreId', ParseUUIDPipe) appelOffreId: string,
  ): Promise<RecoursEntity[]> {
    return this.recoursService.findByAppelOffre(appelOffreId);
  }

  // ─────────────────────────────────────────────────────────────────────
  // GET /recours/:id – Détail d'un recours
  // ─────────────────────────────────────────────────────────────────────
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Détail d'un recours avec examen et historique",
    description:
      "Retourne le recours complet incluant l'examen en cours et l'historique des transitions de statut.",
  })
  @ApiParam({
    name: 'id',
    description: 'UUID du recours',
    example: '550e8400-e29b-41d4-a716-446655440010',
  })
  @ApiResponse({ status: 200, type: RecoursEntity })
  @ApiResponse({ status: 404, description: 'Recours introuvable' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<RecoursEntity> {
    return this.recoursService.findByIdWithRelations(id);
  }

  // ─────────────────────────────────────────────────────────────────────
  // PATCH /recours/:id – Modifier un recours (statut DEPOSE uniquement)
  // ─────────────────────────────────────────────────────────────────────
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Modifier un recours (avant examen)',
    description:
      "Modifie le motif ou les pièces jointes d'un recours. Uniquement possible si le statut est **DEPOSE**.",
  })
  @ApiParam({ name: 'id', description: 'UUID du recours' })
  @ApiResponse({ status: 200, type: RecoursEntity })
  @ApiResponse({ status: 403, description: 'Modification impossible hors état DEPOSE' })
  @ApiResponse({ status: 404, description: 'Recours introuvable' })
  async modifier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecoursDto,
    @Headers('x-user-id') acteurId: string,
  ): Promise<RecoursEntity> {
    return this.recoursService.modifier(id, dto, acteurId);
  }

  // ─────────────────────────────────────────────────────────────────────
  // PATCH /recours/:id/examiner – Ouvrir l'examen (Art. 84)
  // ─────────────────────────────────────────────────────────────────────
  @Patch(':id/examiner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Ouvrir l'examen d'un recours (DEPOSE → EN_EXAMEN)",
    description: `
Déclenche l'examen d'un recours par la **Commission des marchés** (Art. 84 Loi 23-12).
Transition: DEPOSE → EN_EXAMEN.
    `,
  })
  @ApiParam({ name: 'id', description: 'UUID du recours' })
  @ApiResponse({ status: 200, description: 'Examen ouvert', type: RecoursEntity })
  @ApiResponse({ status: 400, description: 'Transition de statut invalide' })
  @ApiResponse({ status: 409, description: 'Un examen est déjà en cours' })
  async examiner(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExaminerRecoursDto,
    @Headers('x-user-id') acteurId: string,
  ): Promise<RecoursEntity> {
    return this.recoursService.examiner(id, dto, acteurId);
  }

  // ─────────────────────────────────────────────────────────────────────
  // PATCH /recours/:id/statuer – Décision finale (ACCEPTE/REJETE)
  // ─────────────────────────────────────────────────────────────────────
  @Patch(':id/statuer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Statuer sur un recours (EN_EXAMEN → ACCEPTE | REJETE)',
    description: `
Prononce la décision finale de la Commission des marchés sur le recours.
Transitions autorisées depuis EN_EXAMEN: **ACCEPTE** ou **REJETE**.

**Impact:** Si ACCEPTE, le service Attribution sera notifié via RabbitMQ
pour réviser l'attribution provisoire.
    `,
  })
  @ApiParam({ name: 'id', description: 'UUID du recours' })
  @ApiResponse({ status: 200, description: 'Décision enregistrée', type: RecoursEntity })
  @ApiResponse({ status: 400, description: 'Transition de statut invalide' })
  @ApiResponse({ status: 409, description: 'Recours déjà décidé' })
  async statuer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StatuerRecoursDto,
    @Headers('x-user-id') acteurId: string,
  ): Promise<RecoursEntity> {
    return this.recoursService.statuer(id, dto, acteurId);
  }
}
