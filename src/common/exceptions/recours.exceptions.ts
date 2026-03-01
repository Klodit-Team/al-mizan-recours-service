import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { RECOURS_ERRORS } from '../constants/recours.constants';

export class RecoursNotFoundException extends NotFoundException {
  constructor(id: string) {
    super({
      code: 'RECOURS_NOT_FOUND',
      message: RECOURS_ERRORS.NOT_FOUND,
      detail: `Aucun recours trouvé avec l'identifiant: ${id}`,
    });
  }
}

export class DelaiDeposeExceptionException extends UnprocessableEntityException {
  constructor(dateDepot: Date, dateLimite: Date) {
    super({
      code: 'RECOURS_DELAI_DEPASSE',
      message: RECOURS_ERRORS.DELAI_DEPASSE,
      detail: `Date de dépôt: ${dateDepot.toISOString()} | Date limite légale: ${dateLimite.toISOString()}`,
    });
  }
}

export class StatutTransitionException extends BadRequestException {
  constructor(ancienStatut: string, nouveauStatut: string) {
    super({
      code: 'RECOURS_STATUT_INVALIDE',
      message: RECOURS_ERRORS.STATUT_INVALIDE,
      detail: `Impossible de passer de "${ancienStatut}" à "${nouveauStatut}"`,
    });
  }
}

export class ExamenExistantException extends ConflictException {
  constructor(recoursId: string) {
    super({
      code: 'RECOURS_EXAMEN_EXISTE',
      message: RECOURS_ERRORS.EXAMEN_EXISTE_DEJA,
      detail: `Le recours ${recoursId} est déjà en cours d'examen`,
    });
  }
}

export class RecoursDejaDecideException extends ConflictException {
  constructor(recoursId: string, statut: string) {
    super({
      code: 'RECOURS_ALREADY_DECIDED',
      message: RECOURS_ERRORS.ALREADY_DECIDED,
      detail: `Le recours ${recoursId} a le statut final: ${statut}`,
    });
  }
}
