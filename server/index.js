import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';
import prisma from './prisma.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

const defaultData = {
  projects: [],
  objectives: [],
  hierarchyLinks: [],
  roadmapItems: [],
  costPlan: [],
  benefitPlans: [],
  budgets: [],
  baselines: [],
  tasks: [],
  todos: [],
  checklists: [],
  risks: [],
  issues: [],
  changes: [],
  agreements: [],
  statusReports: [],
  resources: [],
  timesheets: [],
  ideas: [],
  investments: [],
  teams: [],
  adhocReports: [],
  dataDesignerDefs: [],
  uiDesignerDefs: [],
  blueprints: [],
  fieldResources: [],
  fieldTasks: [],
  schedule: [],
  allocations: [],
  execution: [],
  boq: [],
  devices: [],
  reports: [],
  slaRecords: [],
  billingRecords: [],
  syncLog: [],
  assumptions: [],
  stakeholders: [],
  lessons: [],
  systemSettings: [],
  fieldSecurity: [],
  apiKeys: [],
  savedViews: [],
};

const usePrisma = Boolean(process.env.DATABASE_URL);

async function ensureDb() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }

  const raw = await fs.readFile(DATA_FILE, 'utf8');
  const parsed = JSON.parse(raw || '{}');
  const merged = { ...defaultData, ...parsed };

  for (const key of Object.keys(defaultData)) {
    if (!Array.isArray(merged[key])) merged[key] = [];
  }

  await fs.writeFile(DATA_FILE, JSON.stringify(merged, null, 2));
  return merged;
}

async function readDb() {
  return ensureDb();
}

async function readDbFromPrisma() {
  const rows = await prisma.collectionRecord.findMany({
    orderBy: [{ collection: 'asc' }, { id: 'asc' }],
  });

  const grouped = {};
  for (const row of rows) {
    grouped[row.collection] ??= [];
    grouped[row.collection].push(row.data);
  }

  for (const key of Object.keys(defaultData)) {
    grouped[key] ??= [];
  }

  return grouped;
}

async function writeDb(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
  return data;
}

async function writeDbToPrisma(data) {
  const operations = [];

  for (const [collectionName, records] of Object.entries(data)) {
    if (!Array.isArray(records)) continue;

    for (const record of records) {
      const payload = record && typeof record === 'object' ? record : { value: record };
      const id = String(payload.id ?? `${collectionName}-${crypto.randomUUID().slice(0, 8)}`);
      const finalRecord = { ...payload, id };

      operations.push(
        prisma.collectionRecord.upsert({
          where: { collection_id: { collection: collectionName, id } },
          update: { data: finalRecord },
          create: { collection: collectionName, id, data: finalRecord },
        }),
      );
    }
  }

  if (operations.length > 0) {
    await prisma.$transaction(operations);
  }

  return data;
}

function makeId(prefix = 'rec') {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: usePrisma ? 'Nexus PPM API is running with PostgreSQL' : 'Nexus PPM API is running with JSON storage' });
});

app.get('/api/data', async (req, res) => {
  try {
    const db = usePrisma ? await readDbFromPrisma() : await readDb();
    res.json(db);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load data', details: error.message });
  }
});

app.get('/api/:collection', async (req, res) => {
  try {
    const { collection } = req.params;
    const db = usePrisma ? await readDbFromPrisma() : await readDb();
    const records = Array.isArray(db[collection]) ? db[collection] : [];
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list collection', details: error.message });
  }
});

app.post('/api/:collection', async (req, res) => {
  try {
    const { collection } = req.params;
    const payload = req.body || {};
    const db = usePrisma ? await readDbFromPrisma() : await readDb();

    if (!Array.isArray(db[collection])) {
      return res.status(404).json({ error: `Collection '${collection}' not found` });
    }

    const record = {
      ...payload,
      id: payload.id || makeId(collection.slice(0, 4)),
    };

    db[collection].push(record);
    if (usePrisma) {
      await writeDbToPrisma(db);
    } else {
      await writeDb(db);
    }
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create record', details: error.message });
  }
});

app.put('/api/:collection/:id', async (req, res) => {
  try {
    const { collection, id } = req.params;
    const payload = req.body || {};
    const db = usePrisma ? await readDbFromPrisma() : await readDb();

    if (!Array.isArray(db[collection])) {
      return res.status(404).json({ error: `Collection '${collection}' not found` });
    }

    const index = db[collection].findIndex((item) => item.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const updated = { ...db[collection][index], ...payload, id };
    db[collection][index] = updated;

    if (usePrisma) {
      await writeDbToPrisma(db);
    } else {
      await writeDb(db);
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update record', details: error.message });
  }
});

app.delete('/api/:collection/:id', async (req, res) => {
  try {
    const { collection, id } = req.params;
    const db = usePrisma ? await readDbFromPrisma() : await readDb();

    if (!Array.isArray(db[collection])) {
      return res.status(404).json({ error: `Collection '${collection}' not found` });
    }

    const next = db[collection].filter((item) => item.id !== id);
    db[collection] = next;

    if (usePrisma) {
      await writeDbToPrisma(db);
    } else {
      await writeDb(db);
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete record', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Nexus PPM API running on http://localhost:${PORT}`);
  if (usePrisma) {
    console.log('PostgreSQL mode enabled via DATABASE_URL');
  }
});
