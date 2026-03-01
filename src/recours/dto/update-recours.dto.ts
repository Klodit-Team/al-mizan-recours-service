import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsArray,
  IsUrl,
  ArrayMaxSize,
  MinLength,
  MaxLength,
} from 'class-validator';

export class UpdateRecoursDto {
  @ApiPropertyOptional({
    description: 'Motif mis à jour (seulement si statut DEPOSE)',
    minLength: 50,
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MinLength(50)
  @MaxLength(5000)
  motif?: string;

  @ApiPropertyOptional({
    description: 'URLs pièces jointes mises à jour (max 10)',
    type: [String],
    example: ['https://minio.almizan.dz/recours/doc-v2.pdf'],
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  @ArrayMaxSize(10)
  piecesJointesUrls?: string[];
}
