import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatutRecours } from '@prisma/client';

export class ExamenRecoursEntity {
  @ApiProperty() id: string;
  @ApiProperty() recoursId: string;
  @ApiProperty() examinateurId: string;
  @ApiPropertyOptional() notes?: string;
  @ApiPropertyOptional() recommandation?: string;
  @ApiPropertyOptional() dateExamen?: Date;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class HistoriqueStatutEntity {
  @ApiProperty() id: string;
  @ApiProperty() recoursId: string;
  @ApiPropertyOptional({ enum: StatutRecours }) ancienStatut?: StatutRecours;
  @ApiProperty({ enum: StatutRecours }) nouveauStatut: StatutRecours;
  @ApiProperty() acteurId: string;
  @ApiPropertyOptional() commentaire?: string;
  @ApiProperty() createdAt: Date;
}

export class RecoursEntity {
  @ApiProperty({ description: 'Identifiant unique UUID' })
  id: string;

  @ApiProperty({ description: "Référence de l'AO concerné" })
  appelOffreId: string;

  @ApiProperty({ description: "Identifiant de l'opérateur économique" })
  operateurId: string;

  @ApiProperty({ description: "Identifiant de l'attribution provisoire contestée" })
  attributionProvisoireId: string;

  @ApiProperty({ description: 'Référence unique du recours', example: 'REC-2026-0001' })
  reference: string;

  @ApiProperty({ description: 'Motif détaillé du recours' })
  motif: string;

  @ApiPropertyOptional({ description: 'URLs des pièces jointes (MinIO)', type: [String] })
  piecesJointesUrls?: string[];

  @ApiProperty({ description: 'Date et heure de dépôt (horodatage serveur)' })
  dateDepot: Date;

  @ApiProperty({ description: 'Date limite légale de réponse (date_depot + 10j)' })
  dateLimiteReponse: Date;

  @ApiProperty({ enum: StatutRecours, description: 'Statut courant du recours' })
  statut: StatutRecours;

  @ApiPropertyOptional({ description: 'Décision finale' })
  decision?: string;

  @ApiPropertyOptional({ description: 'Motif de la décision' })
  motifDecision?: string;

  @ApiPropertyOptional({ description: 'Date de la décision' })
  dateDecision?: Date;

  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  @ApiPropertyOptional({ type: ExamenRecoursEntity })
  examen?: ExamenRecoursEntity;

  @ApiPropertyOptional({ type: [HistoriqueStatutEntity] })
  historique?: HistoriqueStatutEntity[];
}

export class PaginatedRecoursEntity {
  @ApiProperty({ type: [RecoursEntity] })
  data: RecoursEntity[];

  @ApiProperty({ description: 'Total des résultats' })
  total: number;

  @ApiProperty({ description: 'Page courante' })
  page: number;

  @ApiProperty({ description: 'Nombre par page' })
  limit: number;

  @ApiProperty({ description: 'Nombre total de pages' })
  totalPages: number;
}
