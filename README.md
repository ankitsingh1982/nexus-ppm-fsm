# Nexus PPM + Field Ops

A Vite + React prototype of a Clarity-style PPM platform with a Node.js API backend. The API uses the included JSON database by default, or PostgreSQL when `DATABASE_URL` is configured.

## Architecture

- Frontend: React + Vite
- Backend: Express API in `server/index.js`
- Persistence: JSON file in `server/data/db.json` by default; PostgreSQL via Prisma when `DATABASE_URL` is set
- Data access: browser calls `/api/*` instead of direct Firestore access

## Structure

```
index.html              Vite entry point
server/
  index.js               Express API with CRUD endpoints
  data/db.json            Persistent JSON database
src/
  main.jsx               React root
  App.jsx                App shell — sidebar, routing, layout
  api.js                 API helper wrapper for frontend CRUD
  App.css                Styling
  seed.jsx               Shared utilities and page scaffolding
  components/
    StrategicPages.jsx   Objectives, Hierarchies, Roadmaps
    WorkPages.jsx         Projects, Baselines, Ideas, Investments, Teams
    ExecutionPages.jsx    Tasks, status, risks/issues/changes, checklists, agreements
    FsmPages.jsx          Field Service Management modules
    AdminPages.jsx        Administration, system settings, API keys, security
```

## Run locally

```bash
npm install
npm run dev
```

This starts both:
- the API on http://localhost:5000
- the Vite app on http://localhost:5173

No database configuration is required for local development. The API uses the records in `server/data/db.json` and saves changes there.

## Use Neon PostgreSQL

Create a `.env` file in the repository root and set `DATABASE_URL` to your Neon connection string (including `sslmode=require`), then generate the Prisma client and apply the schema:

```env
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
```

```bash
npm run db:generate
npm run db:push
npm run dev
```

When `DATABASE_URL` is set, the API uses PostgreSQL instead of the local JSON file. Keep `.env` private; it is excluded from Git.

## Build

```bash
npm run build
npm run preview   # serve the production build locally
```

## API notes

The app now uses a Node.js API layer for CRUD operations. All collection writes go through endpoints such as:

```text
GET /api/data
GET /api/projects
POST /api/projects
PUT /api/projects/:id
DELETE /api/projects/:id
```

The JSON backend is intended for local development and prototype use. PostgreSQL mode requires the Prisma client to be generated with `npm run db:generate` and the schema to be applied with `npm run db:push`.
