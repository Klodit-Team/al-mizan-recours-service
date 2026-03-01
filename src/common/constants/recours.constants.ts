export const RECOURS_DELAI_LEGAL_JOURS = 10; // Art. 83 Loi 23-12

export const RABBITMQ_EVENTS = {
  RECOURS_DEPOSE: 'recours.depose',
  RECOURS_EN_EXAMEN: 'recours.en_examen',
  RECOURS_ACCEPTE: 'recours.accepte',
  RECOURS_REJETE: 'recours.rejete',
  RECOURS_DELAI_EXPIRE: 'recours.delai_expire',
} as const;

export const RECOURS_ERRORS = {
  NOT_FOUND: 'Recours introuvable',
  DELAI_DEPASSE: 'Le délai légal de dépôt de recours est expiré (Art. 83 Loi 23-12)',
  STATUT_INVALIDE: 'La transition de statut demandée est invalide',
  EXAMEN_EXISTE_DEJA: 'Un examen est déjà en cours pour ce recours',
  ALREADY_DECIDED: "Ce recours a déjà fait l'objet d'une décision",
  DUPLICATE_REFERENCE: 'Une référence de recours identique existe déjà',
} as const;

export const RECOURS_TRANSITIONS: Record<string, string[]> = {
  DEPOSE: ['EN_EXAMEN'],
  EN_EXAMEN: ['ACCEPTE', 'REJETE'],
  ACCEPTE: [],
  REJETE: [],
};
