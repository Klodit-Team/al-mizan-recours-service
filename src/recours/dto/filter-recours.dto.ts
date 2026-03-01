import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { StatutRecours } from '@prisma/client';
import { Type } from 'class-transformer';

export class FilterRecoursDto {
  @ApiPropertyOptional({
    description: 'Filtrer par statut',
    enum: StatutRecours,
    example: StatutRecours.DEPOSE,
  })
  @IsOptional()
  @IsEnum(StatutRecours)
  statut?: StatutRecours;

  @ApiPropertyOptional({
    description: "Filtrer par appel d'offres",
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsUUID()
  appelOffreId?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par opérateur économique',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsOptional()
  @IsUUID()
  operateurId?: string;

  @ApiPropertyOptional({
    description: 'Date de début de la période (ISO 8601)',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString()
  dateDebut?: string;

  @ApiPropertyOptional({
    description: 'Date de fin de la période (ISO 8601)',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  dateFin?: string;

  @ApiPropertyOptional({
    description: 'Numéro de page',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Nombre de résultats par page',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}
