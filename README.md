# GenAI2 Frontend

Copilot-powered web UI for managing report runs. Built with Next.js App Router, React Query, CopilotKit UI, and Tailwind CSS.

## Prerequisites

- Node.js 20+
- npm (or pnpm/yarn)
- Running backend (FastAPI) that exposes:
  - `GET /reports`, `POST /reports`
  - `GET /reports/{id}/runs`, `POST /reports/{id}/runs`
  - `GET /runs/{id}`, `POST /runs/{id}/start`, `POST /runs/{id}/upload`
  - `GET /runs/{id}/stream` (SSE)
  - `POST /copilot` (CopilotKit agent endpoint)

## Setup

1. **Environment variables**

   ```bash
   cp .env.example .env
   ```

   Update the values to point at your backend:
   - `NEXT_PUBLIC_API_BASE_URL` – FastAPI base URL (e.g. `https://keck.gleicechaves.com`)
   - `NEXT_PUBLIC_COPILOT_AGENT_PATH` – Copilot agent path (default `/copilot`)
   - `NEXT_PUBLIC_COPILOT_AGENT_NAME` – Display name shown in the UI  
     These same values without the `NEXT_PUBLIC_` prefix are read on the server; keep them in sync.

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the dev server**
   ```bash
   npm run dev
   ```
   The app runs on [http://localhost:3000](http://localhost:3000).

> If you modify `.env`, restart `npm run dev` so Next.js rebuilds with the new `NEXT_PUBLIC_*` values.

## Project Structure

```
app/
  reports/…           # Reports list, run history, copilot workspace
components/
  providers/          # App-wide providers (React Query, CopilotKit)
  ui/                 # Button, modal, spinner, etc.
context/
  run-session-context # Global report/run session store
hooks/
  use-run-stream      # SSE hook for run progress
lib/
  api/                # Axios wrappers for reports, runs
  config.ts           # Environment resolution helpers
```

## Copilot Integration

- Layout wraps the tree with `<CopilotKit>` so Copilot chat UI is active.
- `COPILOT_RUNTIME_URL` is computed from env vars and points to the backend `/copilot` endpoint.
- Run workspace streams `GET /runs/{runId}/stream`, pushes snapshots into CopilotKit state, and renders `<CopilotChat>` for the right-hand chat panel.

## Available Scripts

- `npm run dev` – start dev server
- `npm run build` – production build
- `npm run start` – run the built app
- `npm run lint` – ESLint
- `npm run typecheck` – TypeScript check
- `npm run format` / `npm run format:fix` – Prettier

## Troubleshooting

- **Still hitting localhost?** Ensure `.env` has `NEXT_PUBLIC_API_BASE_URL`, delete `.next/`, and restart `npm run dev`. Check browser console for `[config] API_BASE_URL`.
- **SSE disconnects?** When the stream drops, the UI falls back to polling and shows a warning toast; verify the backend `/runs/{id}/stream` endpoint.
- **File upload rejected?** Files must be under 25 MB and have one of the allowed MIME types (PDF, JSON, text, PNG, JPEG/WEBP). Errors surface as toasts.

## Deployment Notes

Deploy like any Next.js 15 App Router project. Set the same environment variables (`NEXT_PUBLIC_API_BASE_URL`, etc.) in your hosting provider so the client bundle points at the correct backend. CopilotKit runs purely against your FastAPI endpoints; no Copilot Cloud configuration is required.
