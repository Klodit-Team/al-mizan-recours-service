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
  UseInterceptors,
} from '@nestjs/common';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
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
import { UpdateRecoursDto, FilterRecoursDto, ExaminerRecoursDto, StatuerRecoursDto } from '../dto/index';
import { RecoursEntity, PaginatedRecoursEntity } from '../entities/recours.entity';

@ApiTags('recours')
@ApiBearerAuth('session-cookie')
@ApiHeader({ name: 'x-user-id', description: "Identifiant utilisateur injecté par l'API Gateway", required: true })
@ApiHeader({ name: 'x-user-roles', description: "Rôles utilisateur (JSON array) injectés par l'API Gateway", required: true })
@Controller('recours')
export class RecoursController {
  constructor(private readonly recoursService: RecoursService) {}

  // POST /recours – Déposer un recours (Art. 82 Loi 23-12)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Déposer un recours' })
  @ApiResponse({ status: 201, description: 'Recours déposé avec succès', type: RecoursEntity })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 422, description: 'Délai légal de dépôt dépassé' })
  async deposer(
    @Body() dto: CreateRecoursDto,
    @Headers('x-user-id') acteurId: string,
  ): Promise<RecoursEntity> {
    return this.recoursService.deposer(dto, acteurId);
  }

  // GET /recours – Lister tous les recours (cache 2 min)
  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheKey('recours:list')
  @CacheTTL(120)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lister les recours', description: 'Liste paginée. Cache Redis: 2 minutes.' })
  @ApiResponse({ status: 200, type: PaginatedRecoursEntity })
  async findAll(@Query() filters: FilterRecoursDto): Promise<PaginatedRecoursEntity> {
    return this.recoursService.findAll(filters);
  }

  // GET /recours/statistiques – Cache 5 min
  @Get('statistiques')
  @UseInterceptors(CacheInterceptor)
  @CacheKey('recours:statistiques')
  @CacheTTL(300)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Statistiques des recours par statut', description: 'Cache Redis: 5 minutes.' })
  @ApiResponse({ 
    status: 200, 
    description: 'Compteurs par statut',
    schema: {
      type: 'object',
      properties: {
        DEPOSE: { type: 'integer', example: 5 },
        EN_EXAMEN: { type: 'integer', example: 2 },
        ACCEPTE: { type: 'integer', example: 1 },
        REJETE: { type: 'integer', example: 3 }
      }
    }
  })
  async getStatistiques() {
    return this.recoursService.getStatistiques();
  }

  // GET /recours/delais-expires
  @Get('delais-expires')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recours avec délai de réponse expiré' })
  @ApiResponse({ 
    status: 200, 
    description: 'Identifiants des recours en retard',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'integer', example: 2 },
        ids: {
          type: 'array',
          items: { type: 'string', format: 'uuid' },
          example: ['550e8400-e29b-41d4-a716-446655440001']
        }
      }
    }
  })
  async verifierDelais() {
    return this.recoursService.verifierDelaisExpires();
  }

  // GET /recours/operateur/:operateurId – Cache 1 min
  @Get('operateur/:operateurId')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Recours d'un opérateur économique", description: 'Cache Redis: 1 minute.' })
  @ApiParam({ name: 'operateurId', description: "UUID de l'opérateur économique" })
  @ApiResponse({ status: 200, type: PaginatedRecoursEntity })
  async findByOperateur(
    @Param('operateurId', ParseUUIDPipe) operateurId: string,
    @Query() filters: FilterRecoursDto,
  ): Promise<PaginatedRecoursEntity> {
    return this.recoursService.findByOperateur(operateurId, filters);
  }

  // GET /recours/appel-offre/:appelOffreId – Cache 2 min
  @Get('appel-offre/:appelOffreId')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(120)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Recours pour un appel d'offres", description: 'Cache Redis: 2 minutes.' })
  @ApiParam({ name: 'appelOffreId', description: "UUID de l'appel d'offres" })
  @ApiResponse({ status: 200, type: [RecoursEntity] })
  async findByAppelOffre(
    @Param('appelOffreId', ParseUUIDPipe) appelOffreId: string,
  ): Promise<RecoursEntity[]> {
    return this.recoursService.findByAppelOffre(appelOffreId);
  }

  // GET /recours/:id – Cache 1 min
  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Détail d'un recours", description: 'Cache Redis: 1 minute.' })
  @ApiParam({ name: 'id', description: 'UUID du recours' })
  @ApiResponse({ status: 200, type: RecoursEntity })
  @ApiResponse({ status: 404, description: 'Recours introuvable' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<RecoursEntity> {
    return this.recoursService.findByIdWithRelations(id);
  }

  // PATCH /recours/:id
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Modifier un recours (avant examen)' })
  @ApiParam({ name: 'id', description: 'UUID du recours' })
  @ApiResponse({ status: 200, type: RecoursEntity })
  async modifier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecoursDto,
    @Headers('x-user-id') acteurId: string,
  ): Promise<RecoursEntity> {
    return this.recoursService.modifier(id, dto, acteurId);
  }

  // PATCH /recours/:id/examiner
  @Patch(':id/examiner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Ouvrir l'examen (DEPOSE → EN_EXAMEN)" })
  @ApiParam({ name: 'id', description: 'UUID du recours' })
  @ApiResponse({ status: 200, type: RecoursEntity })
  async examiner(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExaminerRecoursDto,
    @Headers('x-user-id') acteurId: string,
  ): Promise<RecoursEntity> {
    return this.recoursService.examiner(id, dto, acteurId);
  }

  // PATCH /recours/:id/statuer
  @Patch(':id/statuer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Statuer sur un recours (EN_EXAMEN → ACCEPTE | REJETE)' })
  @ApiParam({ name: 'id', description: 'UUID du recours' })
  @ApiResponse({ status: 200, type: RecoursEntity })
  async statuer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StatuerRecoursDto,
    @Headers('x-user-id') acteurId: string,
  ): Promise<RecoursEntity> {
    return this.recoursService.statuer(id, dto, acteurId);
  }
}
