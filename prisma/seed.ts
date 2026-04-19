import { PrismaClient, StatutRecours } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL must be defined');
}

const adapter = new PrismaMariaDb(connectionString);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding recours database...');

  const recours1 = await prisma.recours.upsert({
    where: { reference: 'REC-2026-0001' },
    update: {
      motif:
        'Les critères de notation technique ont été appliqués de manière non conforme aux dispositions du cahier des charges.',
      piecesJointesUrls: ['https://minio.almizan.dz/recours/doc1.pdf'],
      dateLimiteReponse: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      statut: StatutRecours.DEPOSE,
    },
    create: {
      appelOffreId: '550e8400-e29b-41d4-a716-446655440001',
      operateurId: '550e8400-e29b-41d4-a716-446655440002',
      attributionProvisoireId: '550e8400-e29b-41d4-a716-446655440003',
      reference: 'REC-2026-0001',
      motif:
        'Les critères de notation technique ont été appliqués de manière non conforme aux dispositions du cahier des charges.',
      piecesJointesUrls: ['https://minio.almizan.dz/recours/doc1.pdf'],
      dateDepot: new Date(),
      dateLimiteReponse: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      statut: StatutRecours.DEPOSE,
    },
  });

  console.log(`Created recours: ${recours1.reference}`);
  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
