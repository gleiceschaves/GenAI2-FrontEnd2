# GenAI2 Frontend

Healthcare document processing web UI with real-time updates and AI chat. Built with Next.js 15 App Router, React Query, CopilotKit (chat-only mode), and Tailwind CSS. Features SSE-based real-time pipeline status updates and signature display.

## Prerequisites

- Node.js 20+
- npm (or pnpm/yarn)
- Running backend (FastAPI) that exposes:
  - `GET /reports`, `POST /reports`
  - `GET /reports/{id}/runs`, `POST /reports/{id}/runs`
  - `GET /runs/{id}`, `POST /runs/{id}/start`, `POST /runs/{id}/upload`
  - `GET /runs/{id}/stream` (SSE for real-time status updates)
  - `POST /copilot` (CopilotKit chat endpoint)

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

## Real-Time Updates & Chat

- **SSE Streaming**: Uses `useRunStream` hook to connect to `GET /runs/{runId}/stream` for real-time pipeline status updates (uploading → ocr → structuring → validating → finalizing → done).
- **CopilotKit Chat**: Layout wraps the tree with `<CopilotKit>` in chat-only mode (no agent state management). The `/copilot` endpoint provides chat functionality.
- **Run workspace**: Displays live pipeline progress with signature fields populating as data is extracted. Uses React Query for data caching and EventSource for SSE connections.

### Architecture Notes
- Per-run state tracking via dedicated SSE endpoints (`/runs/{runId}/stream`)
- React Context (`RunSessionProvider`) manages current report/run session
- Callback memoization with `useCallback` and ref-based pattern prevents SSE reconnections
- CopilotKit agent mode is **disabled** to avoid conflicts with per-run architecture

## Available Scripts

- `npm run dev` – start dev server
- `npm run build` – production build
- `npm run start` – run the built app
- `npm run lint` – ESLint
- `npm run typecheck` – TypeScript check
- `npm run format` / `npm run format:fix` – Prettier

## Troubleshooting

- **Still hitting localhost?** Ensure `.env` has `NEXT_PUBLIC_API_BASE_URL`, delete `.next/`, and restart `npm run dev`. Check browser console for `[config] API_BASE_URL`.
- **SSE disconnects?** When the stream drops, the UI falls back to polling and shows a warning toast; verify the backend `/runs/{id}/stream` endpoint. Open browser DevTools console and look for `[SSE] Received update` logs.
- **Status stuck at "uploading"?** Hard refresh (Ctrl+Shift+R on Windows, Cmd+Shift+R on Mac) and check Network tab for persistent `/runs/{runId}/stream` connection.
- **422 errors or toast messages?** Ensure CopilotKit is in chat-only mode (no `agent` prop in `copilot-provider.tsx`).
- **File upload rejected?** Files must be under 25 MB and have one of the allowed MIME types (PDF, JSON, text, PNG, JPEG/WEBP). Errors surface as toasts.

## Recent Fixes

- **✅ Signature loading**: Backend now loads 19-field signature from database in `/runs/{runId}` endpoint
- **✅ Status display**: Removed notify node so pipeline completes with status="done" instead of "error"
- **✅ Real-time updates**: Restored SSE-based updates via `useRunStream` hook with proper callback memoization
- **✅ CopilotKit 422 errors**: Disabled agent mode to prevent unnecessary `/copilot` state management calls

## Deployment Notes

Deploy like any Next.js 15 App Router project. Set the same environment variables (`NEXT_PUBLIC_API_BASE_URL`, etc.) in your hosting provider so the client bundle points at the correct backend. CopilotKit runs purely against your FastAPI endpoints; no Copilot Cloud configuration is required.
