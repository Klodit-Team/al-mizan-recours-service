import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID, MaxLength } from 'class-validator';

export class ExaminerRecoursDto {
  @ApiProperty({
    description: "Identifiant de l'examinateur (membre de la Commission des marchés)",
    example: '550e8400-e29b-41d4-a716-446655440099',
  })
  @IsUUID()
  @IsNotEmpty()
  examinateurId: string;

  @ApiPropertyOptional({
    description: "Notes d'examen préliminaires",
    maxLength: 2000,
    example: 'Dossier complet. Les pièces justificatives sont conformes.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Recommandation préliminaire avant décision collégiale',
    maxLength: 1000,
    example: 'Recours fondé – recommande révision de la notation technique.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  recommandation?: string;
}
