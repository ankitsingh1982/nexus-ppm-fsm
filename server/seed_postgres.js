import fs from 'fs/promises';
import path from 'path';
import prisma from './prisma.js';

function mapStatus(raw) {
  if (!raw) return 'DRAFT';
  const s = String(raw).toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  const allowed = new Set(['DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']);
  if (allowed.has(s)) return s;
  // handle common human statuses
  if (s.includes('TRACK') || s.includes('AT_RISK') || s.includes('AT_RISK')) return 'ACTIVE';
  if (s.includes('COMPLETE') || s.includes('DONE')) return 'COMPLETED';
  if (s.includes('HOLD')) return 'ON_HOLD';
  if (s.includes('CANCEL')) return 'CANCELLED';
  return 'ACTIVE';
}

async function seedFromJson() {
  const dbPath = path.join(process.cwd(), 'server', 'data', 'db.json');
  const raw = await fs.readFile(dbPath, 'utf8');
  const db = JSON.parse(raw || '{}');

  const collections = Object.entries(db).filter(([, value]) => Array.isArray(value));

  // Upsert generic CollectionRecord entries
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

  // Seed Objectives into the structured table if present
  const objectives = Array.isArray(db.objectives) ? db.objectives : [];
  for (const obj of objectives) {
    try {
      const id = String(obj.id ?? `obj-seed-${Math.random().toString(36).slice(2, 10)}`);
      const title = obj.title || obj.name || 'Untitled Objective';
      const description = obj.description || obj.keyResults || null;
      const ownerId = obj.owner || obj.ownerId || null;
      const status = mapStatus(obj.status || obj.state || obj.progress);
      const priority = obj.priority ?? null;
      const startDate = obj.startDate ? new Date(obj.startDate) : null;
      const targetDate = obj.targetDate ? new Date(obj.targetDate) : null;

      await prisma.objective.upsert({
        where: { id },
        update: {
          title,
          description,
          ownerId,
          status,
          priority,
          startDate,
          targetDate,
          data: obj,
        },
        create: {
          id,
          title,
          description,
          ownerId,
          status,
          priority,
          startDate,
          targetDate,
          data: obj,
        },
      });

      // Log an import event
      await prisma.objectiveEvent.create({
        data: {
          objectiveId: id,
          type: 'imported',
          actor: ownerId || null,
          payload: obj,
        },
      });
    } catch (err) {
      console.warn('Failed to seed objective:', err.message || err);
    }
  }

  const total = await prisma.collectionRecord.count();
  const objCount = await prisma.objective.count();
  console.log(`Seeded ${total} generic records and ${objCount} objectives into PostgreSQL.`);
}

seedFromJson()
  .catch((error) => {
    console.error('Failed to seed Postgres:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
