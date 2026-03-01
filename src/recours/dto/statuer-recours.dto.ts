import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, IsNotEmpty, IsOptional, MinLength, MaxLength } from 'class-validator';

export enum DecisionRecours {
  ACCEPTE = 'ACCEPTE',
  REJETE = 'REJETE',
}

export class StatuerRecoursDto {
  @ApiProperty({
    description: 'Décision finale de la Commission des marchés',
    enum: DecisionRecours,
    example: DecisionRecours.ACCEPTE,
  })
  @IsEnum(DecisionRecours)
  decision: DecisionRecours;

  @ApiProperty({
    description: 'Motif détaillé justifiant la décision (obligatoire)',
    minLength: 30,
    maxLength: 3000,
    example:
      "Après examen du dossier, la commission constate que les critères d'évaluation technique ont été appliqués de façon non conforme au CDC section 3.2.",
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(30)
  @MaxLength(3000)
  motifDecision: string;

  @ApiPropertyOptional({
    description: 'Commentaire additionnel (non officiel)',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  commentaire?: string;
}
