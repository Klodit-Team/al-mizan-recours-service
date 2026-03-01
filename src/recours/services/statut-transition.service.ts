import { Injectable } from '@nestjs/common';
import { StatutRecours } from '@prisma/client';
import { RECOURS_TRANSITIONS } from '../../common/constants/recours.constants';
import { StatutTransitionException } from '../../common/exceptions/recours.exceptions';

/**
 * Service implémentant la machine à états du recours.
 * Garantit l'intégrité des transitions selon la Loi 23-12.
 * SRP: uniquement responsable des règles de transition.
 */
@Injectable()
export class StatutTransitionService {
  /**
   * Vérifie si la transition est autorisée et lève une exception sinon.
   */
  validateTransition(ancienStatut: StatutRecours, nouveauStatut: StatutRecours): void {
    const transitionsAutorisees = RECOURS_TRANSITIONS[ancienStatut] ?? [];

    if (!transitionsAutorisees.includes(nouveauStatut)) {
      throw new StatutTransitionException(ancienStatut, nouveauStatut);
    }
  }

  /**
   * Indique si le recours est dans un état final (décision prise).
   */
  isEtatFinal(statut: StatutRecours): boolean {
    return (RECOURS_TRANSITIONS[statut] ?? []).length === 0;
  }

  /**
   * Retourne les transitions possibles depuis un statut donné.
   */
  getTransitionsDisponibles(statut: StatutRecours): StatutRecours[] {
    return (RECOURS_TRANSITIONS[statut] ?? []) as StatutRecours[];
  }
}
