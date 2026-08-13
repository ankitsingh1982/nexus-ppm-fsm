import admin from 'firebase-admin';
import fs from 'fs/promises';
import path from 'path';

async function main() {
  const serviceAccountPath = process.argv[2] || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!serviceAccountPath) {
    console.error('Usage: node export_firestore.js <path-to-service-account.json>');
    process.exit(1);
  }

  let serviceAccountRaw;
  try {
    serviceAccountRaw = await fs.readFile(serviceAccountPath, 'utf8');
  } catch (e) {
    console.error('Failed to read service account file:', e.message);
    process.exit(1);
  }

  let serviceAccount;
  try { serviceAccount = JSON.parse(serviceAccountRaw); } catch (e) { console.error('Invalid JSON in service account file'); process.exit(1); }

  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  const DATA_FILE = path.join(process.cwd(), 'server', 'data', 'db.json');

  // Read existing DB (if any)
  let existing = {};
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    existing = JSON.parse(raw || '{}');
  } catch (e) {
    existing = {};
  }

  // Helper replacer to convert Firestore Timestamps to ISO strings
  function convert(obj) {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map(convert);
    if (typeof obj === 'object') {
      // If object has toDate (Firestore Timestamp), convert to ISO
      if (typeof obj.toDate === 'function') return obj.toDate().toISOString();
      const out = {};
      for (const k of Object.keys(obj)) out[k] = convert(obj[k]);
      return out;
    }
    return obj;
  }

  try {
    const collections = await db.listCollections();
    const result = {};
    for (const col of collections) {
      const colName = col.id;
      console.log('Exporting collection:', colName);
      const snap = await col.get();
      result[colName] = snap.docs.map(d => ({ id: d.id, ...convert(d.data()) }));
    }

    const merged = { ...existing, ...result };
    await fs.writeFile(DATA_FILE, JSON.stringify(merged, null, 2));
    console.log('Export complete. Collections:', Object.keys(result).join(', '));
    console.log('Wrote to', DATA_FILE);
    process.exit(0);
  } catch (e) {
    console.error('Export failed:', e);
    process.exit(1);
  }
}

main();
