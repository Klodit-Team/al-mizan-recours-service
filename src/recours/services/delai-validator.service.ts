import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RECOURS_DELAI_LEGAL_JOURS } from '../../common/constants/recours.constants';

/**
 * Service responsable de la vérification des délais légaux.
 * Art. 83 Loi 23-12: délai de recours = 10 jours après notification attribution provisoire.
 * SRP: cette classe a une seule responsabilité – les calculs de délais.
 */
@Injectable()
export class DelaiValidatorService {
  private readonly delaiJours: number;

  constructor(private readonly config: ConfigService) {
    this.delaiJours = this.config.get<number>(
      'app.recoursDelaiReponseJours',
      RECOURS_DELAI_LEGAL_JOURS,
    );
  }

  /**
   * Calcule la date limite légale de dépôt d'un recours
   * à partir de la date de notification de l'attribution provisoire.
   */
  calculerDateLimite(dateNotification: Date): Date {
    const dateLimite = new Date(dateNotification);
    dateLimite.setDate(dateLimite.getDate() + this.delaiJours);
    return dateLimite;
  }

  /**
   * Calcule la date limite de réponse de la commission à compter du dépôt.
   */
  calculerDateLimiteReponse(dateDepot: Date): Date {
    const dateLimite = new Date(dateDepot);
    dateLimite.setDate(dateLimite.getDate() + this.delaiJours);
    return dateLimite;
  }

  /**
   * Vérifie si un recours peut encore être déposé.
   */
  isDeposable(dateNotificationAttribution: Date): boolean {
    const dateLimite = this.calculerDateLimite(dateNotificationAttribution);
    return new Date() <= dateLimite;
  }

  /**
   * Vérifie si le délai de réponse de la commission est expiré.
   */
  isDelaiReponseExpire(dateLimiteReponse: Date): boolean {
    return new Date() > dateLimiteReponse;
  }

  /**
   * Retourne le nombre de jours restants avant expiration.
   */
  joursRestants(dateLimite: Date): number {
    const diff = dateLimite.getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}
