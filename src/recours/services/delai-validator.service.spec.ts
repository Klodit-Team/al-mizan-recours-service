import { Test } from '@nestjs/testing';
import { DelaiValidatorService } from './delai-validator.service';
import { ConfigService } from '@nestjs/config';

describe('DelaiValidatorService', () => {
  let service: DelaiValidatorService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DelaiValidatorService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(10) },
        },
      ],
    }).compile();

    service = module.get<DelaiValidatorService>(DelaiValidatorService);
  });

  it('calculerDateLimiteReponse() doit ajouter 10 jours', () => {
    const now = new Date('2026-02-22T10:00:00Z');
    const limite = service.calculerDateLimiteReponse(now);
    const expected = new Date('2026-03-04T10:00:00Z');
    expect(limite.toISOString()).toBe(expected.toISOString());
  });

  it('isDeposable() doit retourner true si dans le délai', () => {
    const hier = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(service.isDeposable(hier)).toBe(true);
  });

  it('isDeposable() doit retourner false si hors délai', () => {
    // Notification il y a 15 jours → délai de 10j dépassé
    const ilY15Jours = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    expect(service.isDeposable(ilY15Jours)).toBe(false);
  });

  it('joursRestants() doit retourner le bon nombre de jours', () => {
    const dans5Jours = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    expect(service.joursRestants(dans5Jours)).toBeGreaterThanOrEqual(4);
    expect(service.joursRestants(dans5Jours)).toBeLessThanOrEqual(6);
  });
});
