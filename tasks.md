# Frontend Implementation Plan

## 1. Project Foundations

- [ ] Scaffold a Next.js 15 App Router project with TypeScript, Tailwind CSS, shadcn/ui, and CopilotKit component packages.
- [ ] Configure package scripts (`dev`, `build`, `lint`, `test`) and ensure pnpm workspace settings are in sync.
- [ ] Add `.env.example` with local defaults (`API_BASE_URL=https://keck.gleicechaves.com` and any upload limits).
- [ ] Set up ESLint, Prettier, and husky + lint-staged for consistent formatting and pre-commit checks.

## 2. Core Architecture

- [ ] Create `/lib/api/client.ts` wrapping fetch/axios with the base URL and error normalization for our backend only.
- [ ] Define TypeScript models for Report, Signature, Run, RunSnapshot, RunDocument, ValidationReport, and ChatMessage.
- [ ] Provide React Query in `app/layout.tsx` (QueryClientProvider + hydration) for shared data fetching.
- [ ] Implement a global store/context to track selected report, active run, SSE status, and cached signature.
- [ ] Integrate CopilotKit provider strictly for UI state and components (no separate runtime service).

## 3. Navigation & Routing

- [ ] Route map: `/reports` (default list), `/reports/[reportId]/runs`, `/reports/[reportId]/runs/[runId]`.
- [ ] Add navigation helpers that forward report metadata and signature cache to downstream pages.
- [ ] Implement suspense and error boundaries plus shared loading skeleton components.

## 4. Reports Page

- [ ] Build a table showing Report Name, Latest Signature Version, Total Runs, and Updated At.
- [ ] Wire table to `GET /reports` with debounced search support.
- [ ] Prefetch `GET /reports/{id}/signature` when hovering/clicking rows; on row click route to the Runs page.
- [ ] Implement “Create Report” modal that POSTs `/reports` and, on success, jumps straight to the Chat page for the new run.
- [ ] Provide empty-state, loading shimmer, and toast-based error feedback.

## 5. Runs Page (per report)

- [ ] Fetch report details, current signature, and `GET /reports/{id}/runs`.
- [ ] Render runs table (Run ID, Status, Progress, Created At, Updated At) with row actions.
- [ ] Show a signature panel alongside the table with refresh capability.
- [ ] “Create Run” button should POST `/reports/{id}/runs` and navigate to the Chat page for the created run.
- [ ] Clicking an existing run routes to the Chat page with snapshot prefetch.
- [ ] Handle empty-history and failure states with friendly guidance.

## 6. Chat Workspace

- [ ] Compose layout: top two-thirds split vertically (left preview, right chat), bottom third for chat input and documents.
- [ ] Left preview defaults to signature JSON; switch to document preview when a doc is selected in the bottom section.
- [ ] Right panel renders chat between user and agent using CopilotKit components plus manual input.
- [ ] Bottom band includes chat composer, send button, and multi-file uploader posting to `POST /runs/{runId}/upload`; list uploads with selectable rows.
- [ ] Show run metadata banner (report name, run status, signature version, context notes).
- [ ] Trigger `POST /runs/{runId}/start`, gating the button until docs exist; provide success/error feedback.
- [ ] Open SSE stream `GET /runs/{runId}/stream` to merge snapshots into shared state with reconnect/backoff logic.
- [ ] Fall back to polling `GET /runs/{runId}` on SSE failure and alert the user.
- [ ] Enable “Download JSON” via `GET /outputs/{runId}` when status becomes `done`.

## 7. Copilot & State Synchronization

- [ ] Map backend snapshots to CopilotKit shared state powering chat and side panels.
- [ ] Surface conflict or validation prompts through CopilotKit actions and UI affordances.
- [ ] Persist chat history per run so revisiting loads previous conversation.

## 8. Error Handling & Resilience

- [ ] Centralize API and SSE error handling with toast/banner components and inline states.
- [ ] Cover edge cases: 422 upload validation, 404 expired runs, duplicate report names, network loss.
- [ ] Use optimistic UI patterns (e.g., pending report creation) with rollback on failure.

## 9. Testing & Tooling

- [ ] Write unit/integration tests for API client, hooks, and stores using Vitest + MSW.
- [ ] Add component tests for Reports table, Runs table, and Chat layout (React Testing Library or Playwright).
- [ ] Create an end-to-end smoke flow: create report -> create run -> upload -> start -> stream snapshots -> download output.
- [ ] Configure CI script to run lint, typecheck, tests, and build.

## 10. Handoff & Documentation

- [ ] Summarize implementation decisions, testing coverage, and outstanding gaps before handoff.
- [ ] Add `/docs/troubleshooting.md` with guidance for backend downtime, SSE reconnects, and upload failures.
- [ ] Track future enhancements (advanced conflict resolution UI, role-based access, analytics) in a backlog section.
