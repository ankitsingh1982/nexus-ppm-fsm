import fs from 'fs/promises';
import path from 'path';
import prisma from './prisma.js';

async function seedFromJson() {
  const dbPath = path.join(process.cwd(), 'server', 'data', 'db.json');
  const raw = await fs.readFile(dbPath, 'utf8');
  const db = JSON.parse(raw || '{}');

  const collections = Object.entries(db).filter(([, value]) => Array.isArray(value));

  for (const [collection, records] of collections) {
    for (const record of records) {
      const payload = record && typeof record === 'object' ? record : { value: record };
      const recordId = String(payload.id ?? `${collection}-seed-${Math.random().toString(36).slice(2, 10)}`);
      const data = { ...payload, id: recordId };

      await prisma.collectionRecord.upsert({
        where: {
          collection_id: {
            collection,
            id: recordId,
          },
        },
        update: { data },
        create: {
          collection,
          id: recordId,
          data,
        },
      });
    }
  }

  const count = await prisma.collectionRecord.count();
  console.log(`Seeded ${count} records into PostgreSQL.`);
}

seedFromJson()
  .catch((error) => {
    console.error('Failed to seed Postgres:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
