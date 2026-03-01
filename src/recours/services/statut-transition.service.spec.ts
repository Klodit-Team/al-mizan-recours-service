import { StatutTransitionService } from './statut-transition.service';
import { StatutRecours } from '@prisma/client';
import { StatutTransitionException } from '../../common/exceptions/recours.exceptions';

describe('StatutTransitionService', () => {
  let service: StatutTransitionService;

  beforeEach(() => {
    service = new StatutTransitionService();
  });

  describe('validateTransition()', () => {
    it('DEPOSE → EN_EXAMEN est valide', () => {
      expect(() =>
        service.validateTransition(StatutRecours.DEPOSE, StatutRecours.EN_EXAMEN),
      ).not.toThrow();
    });

    it('EN_EXAMEN → ACCEPTE est valide', () => {
      expect(() =>
        service.validateTransition(StatutRecours.EN_EXAMEN, StatutRecours.ACCEPTE),
      ).not.toThrow();
    });

    it('EN_EXAMEN → REJETE est valide', () => {
      expect(() =>
        service.validateTransition(StatutRecours.EN_EXAMEN, StatutRecours.REJETE),
      ).not.toThrow();
    });

    it('DEPOSE → ACCEPTE est INVALIDE', () => {
      expect(() => service.validateTransition(StatutRecours.DEPOSE, StatutRecours.ACCEPTE)).toThrow(
        StatutTransitionException,
      );
    });

    it('ACCEPTE → REJETE est INVALIDE (état final)', () => {
      expect(() => service.validateTransition(StatutRecours.ACCEPTE, StatutRecours.REJETE)).toThrow(
        StatutTransitionException,
      );
    });

    it('REJETE → EN_EXAMEN est INVALIDE (état final)', () => {
      expect(() =>
        service.validateTransition(StatutRecours.REJETE, StatutRecours.EN_EXAMEN),
      ).toThrow(StatutTransitionException);
    });
  });

  describe('isEtatFinal()', () => {
    it('ACCEPTE est un état final', () => {
      expect(service.isEtatFinal(StatutRecours.ACCEPTE)).toBe(true);
    });

    it('REJETE est un état final', () => {
      expect(service.isEtatFinal(StatutRecours.REJETE)).toBe(true);
    });

    it("DEPOSE n'est pas un état final", () => {
      expect(service.isEtatFinal(StatutRecours.DEPOSE)).toBe(false);
    });

    it("EN_EXAMEN n'est pas un état final", () => {
      expect(service.isEtatFinal(StatutRecours.EN_EXAMEN)).toBe(false);
    });
  });

  describe('getTransitionsDisponibles()', () => {
    it('depuis DEPOSE, seul EN_EXAMEN est disponible', () => {
      const transitions = service.getTransitionsDisponibles(StatutRecours.DEPOSE);
      expect(transitions).toEqual(['EN_EXAMEN']);
    });

    it('depuis EN_EXAMEN, ACCEPTE et REJETE sont disponibles', () => {
      const transitions = service.getTransitionsDisponibles(StatutRecours.EN_EXAMEN);
      expect(transitions).toContain('ACCEPTE');
      expect(transitions).toContain('REJETE');
    });

    it('depuis ACCEPTE, aucune transition disponible', () => {
      const transitions = service.getTransitionsDisponibles(StatutRecours.ACCEPTE);
      expect(transitions).toHaveLength(0);
    });
  });
});
