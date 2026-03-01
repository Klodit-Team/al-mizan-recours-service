/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Tests E2E du Service Recours
 * Nécessite une BDD de test disponible (DATABASE_URL en variable d'env)
 *
 * Lancer avec:
 *   DATABASE_URL="postgresql://..." npx jest --config test/jest-e2e.json
 */
describe('Recours (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const ACTEUR_ID = '550e8400-e29b-41d4-a716-446655440099';

  const createRecoursPayload = {
    appelOffreId: '550e8400-e29b-41d4-a716-446655440001',
    operateurId: '550e8400-e29b-41d4-a716-446655440002',
    attributionProvisoireId: '550e8400-e29b-41d4-a716-446655440003',
    motif:
      'Les critères de notation technique ont été appliqués de manière non conforme aux dispositions du cahier des charges section 3.2.',
    piecesJointesUrls: [],
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('recours-service/v1');

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await prisma.cleanDatabase();
    await app.close();
  });

  // ── POST /recours ─────────────────────────────────────────────────────

  describe('POST /recours-service/v1/recours', () => {
    it('201 – devrait déposer un recours valide', async () => {
      const res = await request(app.getHttpServer())
        .post('/recours-service/v1/recours')
        .set('x-user-id', ACTEUR_ID)
        .set('x-user-roles', JSON.stringify(['OPERATEUR']))
        .send(createRecoursPayload)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.reference).toMatch(/^REC-\d{4}-\d{4}$/);
      expect(res.body.data.statut).toBe('DEPOSE');
    });

    it('400 – devrait rejeter un motif trop court (< 50 car.)', async () => {
      await request(app.getHttpServer())
        .post('/recours-service/v1/recours')
        .set('x-user-id', ACTEUR_ID)
        .set('x-user-roles', JSON.stringify(['OPERATEUR']))
        .send({ ...createRecoursPayload, motif: 'Trop court' })
        .expect(400);
    });

    it('400 – devrait rejeter un UUID invalide pour appelOffreId', async () => {
      await request(app.getHttpServer())
        .post('/recours-service/v1/recours')
        .set('x-user-id', ACTEUR_ID)
        .set('x-user-roles', JSON.stringify(['OPERATEUR']))
        .send({ ...createRecoursPayload, appelOffreId: 'pas-un-uuid' })
        .expect(400);
    });
  });

  // ── GET /recours ──────────────────────────────────────────────────────

  describe('GET /recours-service/v1/recours', () => {
    it('200 – devrait retourner une liste paginée', async () => {
      const res = await request(app.getHttpServer())
        .get('/recours-service/v1/recours')
        .set('x-user-id', ACTEUR_ID)
        .set('x-user-roles', JSON.stringify(['ADMIN']))
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('totalPages');
    });
  });

  // ── Cycle de vie complet DEPOSE → EN_EXAMEN → ACCEPTE ─────────────────

  describe('Cycle de vie complet', () => {
    let recoursId: string;

    it('1. Déposer un recours', async () => {
      const res = await request(app.getHttpServer())
        .post('/recours-service/v1/recours')
        .set('x-user-id', ACTEUR_ID)
        .set('x-user-roles', JSON.stringify(['OPERATEUR']))
        .send(createRecoursPayload)
        .expect(201);

      recoursId = res.body.data.id;
      expect(recoursId).toBeDefined();
    });

    it("2. Ouvrir l'examen (DEPOSE → EN_EXAMEN)", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/recours-service/v1/recours/${recoursId}/examiner`)
        .set('x-user-id', ACTEUR_ID)
        .set('x-user-roles', JSON.stringify(['COMMISSION_MARCHES']))
        .send({
          examinateurId: '550e8400-e29b-41d4-a716-446655440088',
          notes: 'Dossier complet, examen en cours',
        })
        .expect(200);

      expect(res.body.data.statut).toBe('EN_EXAMEN');
      expect(res.body.data.examen).toBeDefined();
    });

    it('3. Accepter le recours (EN_EXAMEN → ACCEPTE)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/recours-service/v1/recours/${recoursId}/statuer`)
        .set('x-user-id', ACTEUR_ID)
        .set('x-user-roles', JSON.stringify(['COMMISSION_MARCHES']))
        .send({
          decision: 'ACCEPTE',
          motifDecision:
            "Après examen du dossier, la commission constate que les critères d'évaluation n'ont pas été appliqués correctement.",
        })
        .expect(200);

      expect(res.body.data.statut).toBe('ACCEPTE');
      expect(res.body.data.decision).toBe('ACCEPTE');
      expect(res.body.data.dateDecision).toBeDefined();
    });

    it("4. Vérifier l'historique complet (3 entrées)", async () => {
      const res = await request(app.getHttpServer())
        .get(`/recours-service/v1/recours/${recoursId}`)
        .set('x-user-id', ACTEUR_ID)
        .set('x-user-roles', JSON.stringify(['ADMIN']))
        .expect(200);

      expect(res.body.data.historique).toHaveLength(3); // DEPOSE, EN_EXAMEN, ACCEPTE
      expect(res.body.data.historique[0].nouveauStatut).toBe('DEPOSE');
      expect(res.body.data.historique[1].nouveauStatut).toBe('EN_EXAMEN');
      expect(res.body.data.historique[2].nouveauStatut).toBe('ACCEPTE');
    });

    it('5. Refuser une nouvelle décision (recours déjà décidé)', async () => {
      await request(app.getHttpServer())
        .patch(`/recours-service/v1/recours/${recoursId}/statuer`)
        .set('x-user-id', ACTEUR_ID)
        .set('x-user-roles', JSON.stringify(['COMMISSION_MARCHES']))
        .send({
          decision: 'REJETE',
          motifDecision: 'Tentative de re-décision après décision finale.',
        })
        .expect(409); // Conflict
    });
  });

  // ── GET /recours/:id – 404 ─────────────────────────────────────────────

  describe('GET /recours-service/v1/recours/:id', () => {
    it('404 – devrait retourner une erreur pour un ID inexistant', async () => {
      await request(app.getHttpServer())
        .get('/recours-service/v1/recours/00000000-0000-0000-0000-000000000000')
        .set('x-user-id', ACTEUR_ID)
        .set('x-user-roles', JSON.stringify(['ADMIN']))
        .expect(404);
    });
  });
});
