# safety-requirements-god-ui

WCGW Safety Suite frontend: React 19 + Vite + TypeScript, Auth0, React Flow graph, PWA. Deployed on Vercel.
Backend: `../safety-requirements-god` · Realtime: `safety-requirements-god-ui-party/` (PartyServer on Cloudflare)

## Run

```sh
npm install
npm run dev            # vite → http://localhost:5173
npm run build          # tsc -b && vite build → dist/
npm run preview
npm run lint
```

Backend must be running (`cd ../safety-requirements-god && npm run dev`).

Env (`.env`):

```sh
VITE_API_URL=http://localhost:3000     # backend base URL
VITE_PARTYSERVER_HOST=...              # collab server host
```

## Realtime collab server

```sh
cd safety-requirements-god-ui-party
npm install
npm run dev            # wrangler dev
npm run deploy         # wrangler deploy (Cloudflare)
```

## Layout

```
src/main.tsx, Root.tsx   entry, auth wrapper
src/App.tsx              main app
src/components/          UI (ConceptCard, modals, ...)
src/lib/                 helpers
src/types/               shared types
```
