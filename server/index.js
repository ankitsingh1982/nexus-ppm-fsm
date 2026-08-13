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

  // Ensure all expected collection keys exist
  for (const key of Object.keys(defaultData)) {
    grouped[key] ??= [];
  }

  // Include structured models (objectives) that live outside collectionRecord
  try {
    const objectives = await readObjectivesFromPrisma();
    grouped['objectives'] = objectives;
  } catch (e) {
    // If the objective model doesn't exist yet, ignore
    console.warn('readDbFromPrisma: could not load prisma.objective', e.message);
    grouped['objectives'] ??= grouped['objectives'] || [];
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

// Objectives helpers for Prisma
function normalizeObjective(obj){
  if(!obj) return obj;
  const dataJson = obj.data && typeof obj.data === 'object' ? obj.data : {};
  return {
    ...obj,
    owner: obj.ownerId ?? obj.owner,
    linkedInvestmentId: dataJson.linkedInvestmentId ?? obj.linkedInvestmentId ?? null,
    actualValue: dataJson.actualValue ?? obj.actualValue ?? null,
    targetValue: dataJson.targetValue ?? obj.targetValue ?? null,
    keyResults: dataJson.keyResults ?? obj.keyResults ?? obj.description ?? null,
  };
}

async function readObjectivesFromPrisma() {
  const rows = await prisma.objective.findMany({ orderBy: { createdAt: 'desc' } });
  return rows.map(normalizeObjective);
}

async function getObjectiveByIdPrisma(id) {
  const obj = await prisma.objective.findUnique({ where: { id } });
  return normalizeObjective(obj);
}

async function createObjectivePrisma(payload) {
  // Allow linkedInvestmentId to be stored inside data JSON
  const dataJson = payload.data && typeof payload.data === 'object' ? { ...payload.data } : {};
  if (payload.linkedInvestmentId !== undefined) dataJson.linkedInvestmentId = payload.linkedInvestmentId;
  if (payload.actualValue !== undefined) dataJson.actualValue = payload.actualValue;
  if (payload.targetValue !== undefined) dataJson.targetValue = payload.targetValue;
  if (payload.keyResults !== undefined) dataJson.keyResults = payload.keyResults;

  const id = await generateNextObjectiveId();

  const data = {
    id,
    title: payload.title || 'Untitled Objective',
    description: payload.description || null,
    ownerId: payload.ownerId || payload.owner || null,
    status: payload.status || 'DRAFT',
    priority: payload.priority ?? null,
    startDate: payload.startDate ? new Date(payload.startDate) : null,
    targetDate: payload.targetDate ? new Date(payload.targetDate) : null,
    data: Object.keys(dataJson).length ? dataJson : null,
  };

  const obj = await prisma.objective.create({ data });
  await prisma.objectiveEvent.create({ data: { objectiveId: obj.id, type: 'created', actor: payload.actor || null, payload: payload } });
  return normalizeObjective(obj);
}

async function updateObjectivePrisma(id, payload) {
  // Fetch existing to merge JSON data and preserve fields not in payload
  const existing = await prisma.objective.findUnique({ where: { id } });
  if (!existing) throw new Error('Objective not found');

  // Prepare update object while handling dates
  const update = {};
  // Only allow certain top-level fields to be updated directly
  const allowedTop = ['title', 'description', 'ownerId', 'status', 'priority', 'startDate', 'targetDate'];
  for (const k of allowedTop) {
    if (payload[k] !== undefined) update[k] = payload[k];
  }
  // map owner -> ownerId if provided
  if (payload.owner !== undefined && payload.owner !== null) update.ownerId = payload.owner;
  if (payload.startDate) update.startDate = new Date(payload.startDate);
  if (payload.targetDate) update.targetDate = new Date(payload.targetDate);

  // Pull out values that should live under `data` JSON
  const { actualValue, targetValue, data: incomingData, linkedInvestmentId, keyResults } = payload || {};

  const existingData = existing.data && typeof existing.data === 'object' ? existing.data : {};
  const mergedData = { ...existingData, ...(incomingData || {}) };
  if (actualValue !== undefined) mergedData.actualValue = actualValue;
  if (targetValue !== undefined) mergedData.targetValue = targetValue;
  if (linkedInvestmentId !== undefined) mergedData.linkedInvestmentId = linkedInvestmentId;
  if (keyResults !== undefined) mergedData.keyResults = keyResults;

  update.data = mergedData;

  const obj = await prisma.objective.update({ where: { id }, data: update });
  await prisma.objectiveEvent.create({ data: { objectiveId: id, type: 'updated', actor: payload.actor || null, payload: payload } });
  return normalizeObjective(obj);
}

async function logObjectiveEventPrisma(objectiveId, type, actor, payload) {
  return prisma.objectiveEvent.create({ data: { objectiveId, type, actor: actor || null, payload: payload ?? null } });
}

function makeId(prefix = 'rec') {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

// Generate next sequential OBJ-<n> id. Uses existing OBJ-<number> ids when available.
async function generateNextObjectiveId() {
  try {
    const rows = await prisma.objective.findMany({ select: { id: true } });
    let max = 0;
    for (const { id } of rows) {
      if (!id) continue;
      const m = id.match(/^OBJ-(\d+)$/i);
      if (m) {
        const n = parseInt(m[1], 10);
        if (!Number.isNaN(n) && n > max) max = n;
      }
    }
    if (max === 0) max = 1169; // fallback starting point if none exist — keeps numbers reasonable
    return `OBJ-${max + 1}`;
  } catch (e) {
    // If anything goes wrong, fall back to random-ish id
    return makeId('OBJ');
  }
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

// Objectives endpoints (CRUD + action)
app.get('/api/objectives', async (req, res) => {
  try {
    if (usePrisma) {
      const objs = await readObjectivesFromPrisma();
      return res.json(objs);
    }

    const db = await readDb();
    res.json(db.objectives || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list objectives', details: error.message });
  }
});

app.get('/api/objectives/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (usePrisma) {
      const obj = await getObjectiveByIdPrisma(id);
      if (!obj) return res.status(404).json({ error: 'Objective not found' });
      return res.json(obj);
    }

    const db = await readDb();
    const obj = (db.objectives || []).find((o) => o.id === id);
    if (!obj) return res.status(404).json({ error: 'Objective not found' });
    res.json(obj);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get objective', details: error.message });
  }
});

app.post('/api/objectives', async (req, res) => {
  try {
    const payload = req.body || {};
    if (usePrisma) {
      const created = await createObjectivePrisma(payload);
      return res.status(201).json(created);
    }

    const db = await readDb();
    const record = { id: makeId('OBJ'), title: payload.title || 'Untitled Objective', description: payload.description || '', status: payload.status || 'DRAFT', ownerId: payload.ownerId || null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), data: payload.data || null };
    db.objectives.push(record);
    await writeDb(db);
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create objective', details: error.message });
  }
});

app.put('/api/objectives/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};
    if (usePrisma) {
      const updated = await updateObjectivePrisma(id, payload);
      return res.json(updated);
    }

    const db = await readDb();
    const idx = (db.objectives || []).findIndex((o) => o.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Objective not found' });
    const updated = { ...db.objectives[idx], ...payload, id };
    db.objectives[idx] = updated;
    await writeDb(db);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update objective', details: error.message });
  }
});

// Action endpoint: simple state transitions
app.post('/api/objectives/:id/action', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, actor, note } = req.body || {};

    const validActions = new Set(['activate', 'complete', 'hold', 'cancel', 'reopen']);
    if (!validActions.has(action)) return res.status(400).json({ error: 'Invalid action' });

    if (usePrisma) {
      const obj = await getObjectiveByIdPrisma(id);
      if (!obj) return res.status(404).json({ error: 'Objective not found' });

      // Only allow reopen when objective is COMPLETED or CANCELLED
      if (action === 'reopen' && !['COMPLETED', 'CANCELLED'].includes(String(obj.status || '').toUpperCase())) {
        return res.status(400).json({ error: 'Reopen action is allowed only when objective status is COMPLETED or CANCELLED' });
      }

      let newStatus = obj.status;
      if (action === 'activate') newStatus = 'ACTIVE';
      if (action === 'complete') newStatus = 'COMPLETED';
      if (action === 'hold') newStatus = 'ON_HOLD';
      if (action === 'cancel') newStatus = 'CANCELLED';
      if (action === 'reopen') newStatus = 'ACTIVE';

      const updated = await prisma.objective.update({ where: { id }, data: { status: newStatus } });
      await logObjectiveEventPrisma(id, action, actor || null, { note });
      return res.json(updated);
    }

    const db = await readDb();
    const idx = (db.objectives || []).findIndex((o) => o.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Objective not found' });

    const obj = db.objectives[idx];
    // Only allow reopen when objective is COMPLETED or CANCELLED
    if (action === 'reopen' && !['COMPLETED', 'CANCELLED'].includes(String(obj.status || '').toUpperCase())) {
      return res.status(400).json({ error: 'Reopen action is allowed only when objective status is COMPLETED or CANCELLED' });
    }
    let newStatus = obj.status;
    if (action === 'activate') newStatus = 'ACTIVE';
    if (action === 'complete') newStatus = 'COMPLETED';
    if (action === 'hold') newStatus = 'ON_HOLD';
    if (action === 'cancel') newStatus = 'CANCELLED';
    if (action === 'reopen') newStatus = 'ACTIVE';

    obj.status = newStatus;
    obj.updatedAt = new Date().toISOString();
    db.objectives[idx] = obj;
    // append simple event log in syncLog
    db.syncLog = db.syncLog || [];
    db.syncLog.push({ id: makeId('evt'), type: `objective:${action}`, objectiveId: id, actor: actor || null, note: note || null, ts: new Date().toISOString() });

    await writeDb(db);
    res.json(obj);
  } catch (error) {
    res.status(500).json({ error: 'Failed to perform action', details: error.message });
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
