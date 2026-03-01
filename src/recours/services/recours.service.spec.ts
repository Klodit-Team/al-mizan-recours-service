/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { RecoursService } from './recours.service';
import { RecoursRepository } from '../repositories/recours.repository';
import { ReferenceGeneratorService } from './reference-generator.service';
import { DelaiValidatorService } from './delai-validator.service';
import { StatutTransitionService } from './statut-transition.service';
import { RecoursEventPublisher } from '../events/recours-event.publisher';
import { StatutRecours } from '@prisma/client';
import {
  RecoursNotFoundException,
  StatutTransitionException,
  RecoursDejaDecideException,
} from '../../common/exceptions/recours.exceptions';
import { ConfigService } from '@nestjs/config';

// ── Mocks ──────────────────────────────────────────────────────────────

const mockRecoursRepository = {
  findById: jest.fn(),
  findByIdWithRelations: jest.fn(),
  findAll: jest.fn(),
  findByOperateur: jest.fn(),
  findByAppelOffre: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateStatut: jest.fn(),
  findDelaisExpires: jest.fn(),
  countByStatut: jest.fn(),
  createExamen: jest.fn(),
  findExamenByRecoursId: jest.fn(),
  createHistorique: jest.fn(),
  findHistoriqueByRecoursId: jest.fn(),
};

const mockReferenceGenerator = { generate: jest.fn() };
const mockEventPublisher = {
  publishRecoursDepose: jest.fn().mockResolvedValue(undefined),
  publishStatutChange: jest.fn().mockResolvedValue(undefined),
};

const mockConfigService = {
  get: jest.fn().mockImplementation((key: string, def: any) => def),
};

// ── Fixtures ───────────────────────────────────────────────────────────

const recoursDepose = {
  id: 'uuid-001',
  appelOffreId: 'ao-uuid-001',
  operateurId: 'oe-uuid-001',
  attributionProvisoireId: 'attr-uuid-001',
  reference: 'REC-2026-0001',
  motif: "Les critères de notation n'ont pas été correctement appliqués selon le CDC section 3.2.",
  piecesJointesUrls: [],
  dateDepot: new Date(),
  dateLimiteReponse: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
  statut: StatutRecours.DEPOSE,
  decision: null,
  motifDecision: null,
  dateDecision: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const recoursEnExamen = { ...recoursDepose, statut: StatutRecours.EN_EXAMEN };
const recoursAccepte = { ...recoursDepose, statut: StatutRecours.ACCEPTE, decision: 'ACCEPTE' };

// ── Tests ──────────────────────────────────────────────────────────────

describe('RecoursService', () => {
  let service: RecoursService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecoursService,
        { provide: RecoursRepository, useValue: mockRecoursRepository },
        { provide: ReferenceGeneratorService, useValue: mockReferenceGenerator },
        { provide: RecoursEventPublisher, useValue: mockEventPublisher },
        { provide: ConfigService, useValue: mockConfigService },
        DelaiValidatorService,
        StatutTransitionService,
      ],
    }).compile();

    service = module.get<RecoursService>(RecoursService);
    jest.clearAllMocks();
  });

  // ── deposer ──────────────────────────────────────────────────────────

  describe('deposer()', () => {
    const createDto = {
      appelOffreId: 'ao-uuid-001',
      operateurId: 'oe-uuid-001',
      attributionProvisoireId: 'attr-uuid-001',
      motif: "Les critères de notation n'ont pas été correctement appliqués selon le CDC.",
      piecesJointesUrls: [],
    };

    it('devrait créer un recours avec une référence générée', async () => {
      mockReferenceGenerator.generate.mockResolvedValue('REC-2026-0001');
      mockRecoursRepository.create.mockResolvedValue(recoursDepose);
      mockRecoursRepository.createHistorique.mockResolvedValue({});

      const result = await service.deposer(createDto, 'oe-uuid-001');

      expect(mockReferenceGenerator.generate).toHaveBeenCalled();
      expect(mockRecoursRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reference: 'REC-2026-0001',
          motif: createDto.motif,
        }),
      );
      expect(result.reference).toBe('REC-2026-0001');
    });

    it("devrait créer l'historique initial au statut DEPOSE", async () => {
      mockReferenceGenerator.generate.mockResolvedValue('REC-2026-0002');
      mockRecoursRepository.create.mockResolvedValue(recoursDepose);
      mockRecoursRepository.createHistorique.mockResolvedValue({});

      await service.deposer(createDto, 'oe-uuid-001');

      expect(mockRecoursRepository.createHistorique).toHaveBeenCalledWith(
        expect.objectContaining({
          nouveauStatut: StatutRecours.DEPOSE,
          acteurId: createDto.operateurId,
        }),
      );
    });

    it("devrait publier l'événement recours.depose", async () => {
      mockReferenceGenerator.generate.mockResolvedValue('REC-2026-0003');
      mockRecoursRepository.create.mockResolvedValue(recoursDepose);
      mockRecoursRepository.createHistorique.mockResolvedValue({});

      await service.deposer(createDto, 'oe-uuid-001');

      // L'event est publié de manière asynchrone (catch)
      await new Promise((r) => setTimeout(r, 10));
      expect(mockEventPublisher.publishRecoursDepose).toHaveBeenCalledWith(
        expect.objectContaining({ appelOffreId: createDto.appelOffreId }),
      );
    });
  });

  // ── examiner ─────────────────────────────────────────────────────────

  describe('examiner()', () => {
    const examinerDto = {
      examinateurId: 'examinator-uuid',
      notes: 'Dossier complet, examen en cours',
    };

    it('devrait passer le statut DEPOSE → EN_EXAMEN', async () => {
      mockRecoursRepository.findById.mockResolvedValue(recoursDepose);
      mockRecoursRepository.findExamenByRecoursId.mockResolvedValue(null);
      mockRecoursRepository.updateStatut.mockResolvedValue(recoursEnExamen);
      mockRecoursRepository.createExamen.mockResolvedValue({});
      mockRecoursRepository.createHistorique.mockResolvedValue({});
      mockRecoursRepository.findByIdWithRelations.mockResolvedValue(recoursEnExamen);

      const result = await service.examiner('uuid-001', examinerDto, 'controleur-uuid');

      expect(mockRecoursRepository.updateStatut).toHaveBeenCalledWith(
        'uuid-001',
        StatutRecours.EN_EXAMEN,
      );
      expect(result.statut).toBe(StatutRecours.EN_EXAMEN);
    });

    it('devrait lancer une exception si le recours est introuvable', async () => {
      mockRecoursRepository.findById.mockResolvedValue(null);

      await expect(
        service.examiner('uuid-inexistant', examinerDto, 'controleur-uuid'),
      ).rejects.toThrow(RecoursNotFoundException);
    });

    it('devrait lancer une exception si un examen existe déjà', async () => {
      mockRecoursRepository.findById.mockResolvedValue(recoursDepose);
      mockRecoursRepository.findExamenByRecoursId.mockResolvedValue({ id: 'examen-001' });

      await expect(service.examiner('uuid-001', examinerDto, 'controleur-uuid')).rejects.toThrow();
    });

    it('devrait rejeter la transition EN_EXAMEN → ACCEPTE directement', async () => {
      // En_Examen → directement EN_EXAMEN est invalide
      const recoursEnExamenState = { ...recoursDepose, statut: StatutRecours.EN_EXAMEN };
      mockRecoursRepository.findById.mockResolvedValue(recoursEnExamenState);
      mockRecoursRepository.findExamenByRecoursId.mockResolvedValue(null);

      await expect(service.examiner('uuid-001', examinerDto, 'controleur-uuid')).rejects.toThrow(
        StatutTransitionException,
      );
    });
  });

  // ── statuer ──────────────────────────────────────────────────────────

  describe('statuer()', () => {
    const statuerDto = {
      decision: 'ACCEPTE' as any,
      motifDecision: "Les critères n'ont effectivement pas été respectés conformément au CDC.",
    };

    it('devrait passer EN_EXAMEN → ACCEPTE', async () => {
      mockRecoursRepository.findById.mockResolvedValue(recoursEnExamen);
      mockRecoursRepository.update.mockResolvedValue(recoursAccepte);
      mockRecoursRepository.createHistorique.mockResolvedValue({});
      mockRecoursRepository.findByIdWithRelations.mockResolvedValue(recoursAccepte);

      const result = await service.statuer('uuid-001', statuerDto, 'commission-uuid');

      expect(mockRecoursRepository.update).toHaveBeenCalledWith(
        'uuid-001',
        expect.objectContaining({
          statut: StatutRecours.ACCEPTE,
          decision: 'ACCEPTE',
        }),
      );
      expect(result.statut).toBe(StatutRecours.ACCEPTE);
    });

    it('devrait rejeter la décision sur un recours déjà décidé', async () => {
      mockRecoursRepository.findById.mockResolvedValue(recoursAccepte);

      await expect(service.statuer('uuid-001', statuerDto, 'commission-uuid')).rejects.toThrow(
        RecoursDejaDecideException,
      );
    });

    it('devrait rejeter la transition DEPOSE → ACCEPTE (sans passer EN_EXAMEN)', async () => {
      mockRecoursRepository.findById.mockResolvedValue(recoursDepose);

      await expect(service.statuer('uuid-001', statuerDto, 'commission-uuid')).rejects.toThrow(
        StatutTransitionException,
      );
    });
  });

  // ── findAll ──────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('devrait retourner une liste paginée', async () => {
      mockRecoursRepository.findAll.mockResolvedValue({
        data: [recoursDepose],
        total: 1,
      });

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  // ── verifierDelaisExpires ────────────────────────────────────────────

  describe('verifierDelaisExpires()', () => {
    it('devrait retourner les IDs des recours avec délai dépassé', async () => {
      mockRecoursRepository.findDelaisExpires.mockResolvedValue([
        { id: 'uuid-001' },
        { id: 'uuid-002' },
      ]);

      const result = await service.verifierDelaisExpires();

      expect(result.count).toBe(2);
      expect(result.ids).toContain('uuid-001');
    });
  });
});
