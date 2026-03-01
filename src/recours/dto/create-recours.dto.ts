import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsUrl,
  MinLength,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';

export class CreateRecoursDto {
  @ApiProperty({
    description: "Identifiant de l'appel d'offres concerné",
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  @IsNotEmpty()
  appelOffreId: string;

  @ApiProperty({
    description: "Identifiant de l'opérateur économique soumettant le recours",
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsUUID()
  @IsNotEmpty()
  operateurId: string;

  @ApiProperty({
    description: "Identifiant de l'attribution provisoire contestée",
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  @IsUUID()
  @IsNotEmpty()
  attributionProvisoireId: string;

  @ApiProperty({
    description: 'Motif détaillé du recours',
    minLength: 50,
    maxLength: 5000,
    example:
      'Les critères de notation technique ont été appliqués de manière non conforme aux dispositions du cahier des charges section 3.2.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(50, { message: 'Le motif doit comporter au moins 50 caractères' })
  @MaxLength(5000)
  motif: string;

  @ApiPropertyOptional({
    description: 'URLs MinIO des pièces jointes (max 10 documents)',
    type: [String],
    example: ['https://minio.almizan.dz/recours/piece1.pdf'],
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  @ArrayMaxSize(10)
  piecesJointesUrls?: string[];
}
