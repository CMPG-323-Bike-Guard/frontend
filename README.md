# CampusGuard — Frontend

The web client for **CampusGuard**, NWU's RFID-based bike access control system. This repo covers the two user-facing surfaces of the project: the **Guard Dashboard** (live gate status and mismatch alarms) and the **Student/Admin Portal** (bike registration and tag management).

> Backend / API lives in a separate repo: [`backend`](../backend)

## What this app does

- **Guard Dashboard** — real-time view of every gate lane, showing card/tag match results as they happen and raising a clear visual + audio alarm when a mismatch is detected, with enough detail (student number, registered bike, scanned tag) for a guard to act on it.
- **Student Portal** — lets a student register a new bike (make, colour, photo, RFID tag ID) against their student number, view their registered bikes, and report a lost tag.
- **Admin Portal** — staff-only views for issuing/deactivating tags, searching the audit log, and managing registrations on a student's behalf.

## Tech stack (proposed)

| Layer | Choice |
|---|---|
| Framework | React + TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS |
| Data fetching | React Query |
| Real-time updates | WebSocket client (gate/alarm events) |
| Auth | JWT-based session against the backend API |

This is a starting-point stack, not a locked decision — adjust to match whatever the team is most comfortable shipping and maintaining.

## Getting started

```bash
git clone https://github.com/CMPG-323-Bike-Guard/frontend.git
cd frontend
npm install
cp .env.example .env   # set API_BASE_URL and WS_URL to point at your backend
npm run dev
```

The app expects a running instance of `backend` — see that repo's README for setup.

### Environment variables

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Base URL of the backend REST API |
| `VITE_WS_URL` | WebSocket endpoint for live gate/alarm events |
| `VITE_AUTH_DOMAIN` | Auth provider domain (if applicable) |

## Project structure

```
src/
  features/
    dashboard/       # guard-facing live gate view + alarm handling
    registration/     # student bike/tag registration flow
    admin/            # staff tag management + audit log search
  components/          # shared UI components
  hooks/                # shared hooks (websocket, auth, etc.)
  api/                  # typed API client
  routes/               # route definitions
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start local dev server |
| `npm run build` | Production build |
| `npm run lint` | Lint the codebase |
| `npm run test` | Run unit tests |

## Contributing

- Branch off `main` using `feature/<short-description>` or `fix/<short-description>`.
- Open a PR against `main`; at least one review required before merge.
- Keep the Guard Dashboard's alarm path (mismatch detection → alert rendering) covered by tests — it's the most safety-critical piece of the UI.

## Status

Early-stage / pre-pilot. See the project tab to see current progress

## License

TBD.
