# Nexus PPM + Field Ops

A Vite + React prototype of a Clarity-style PPM platform with a Node.js API backend and JSON persistence.

## Architecture

- Frontend: React + Vite
- Backend: Express API in `server/index.js`
- Persistence: JSON file in `server/data/db.json`
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

The JSON backend is meant for local development and prototype use. It can be replaced with PostgreSQL or SQLite in a later production step.
