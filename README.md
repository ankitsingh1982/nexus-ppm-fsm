# Nexus PPM + Field Ops

A Vite + React prototype of a Clarity-style PPM platform, combined with a Field Service
Management suite. In-memory data model, no backend — resets on page reload.

## Structure

```
index.html              Vite entry point
src/
  main.jsx              React root
  App.jsx                App shell — sidebar, routing, layout
  App.css                All styling (design tokens + components)
  seed.jsx               Seed data, NAV config, shared utilities (Badge, CrudPanel, Tabs, etc.)
  components/
    StrategicPages.jsx    Objectives, Hierarchies, Roadmaps
    WorkPages.jsx          Projects, Baselines, Ideas, Custom Investments, Teams
    ExecutionPages.jsx     Tasks Module, Status Module, Risks/Issues/Changes, Checklists, Agreements
    FsmPages.jsx           Field Service Management (7 modules)
    AdminPages.jsx         Financial Management, Resource Management, Insights & Analytics,
                            Administration (Blueprints, Field Security, System Settings, Auth/API)
```

## Run locally

```bash
npm install
npm run dev
```

Then open the printed local URL (usually http://localhost:5173).

## Build

```bash
npm run build
npm run preview   # serve the production build locally
```

## Deploy (Firebase Hosting)

`firebase.json` is already configured to serve the `dist/` output. After building:

```bash
firebase deploy
```

## Notes on this pass

Two bugs were found and fixed while assembling this project from the split-out files:
- `seed.jsx`: one risk/opportunity record had `'Opportunity'` mistakenly assigned to
  `projectId` (and was missing `kind: 'Opportunity'` entirely), so it wouldn't have
  shown up under its project or been tagged as an opportunity.
- `AdminPages.jsx`: the Timesheets table's "Week of" column was missing its `label`,
  so that column header would have rendered blank.

Every page component (33 total) has been server-rendered against the real seed data
as a smoke test — all render without errors. `package.json`, the Vite `index.html`
entry point, and `App.css` (extracted from the previous single-file build) were not
part of the upload and have been added here so the project runs as-is.
