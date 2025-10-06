# Frontend Implementation Plan

## 1. Project Foundations
- [ ] Scaffold a fresh Next.js App Router project with TypeScript, Tailwind CSS, shadcn/ui, and CopilotKit dependencies.
- [ ] Configure package scripts (`dev`, `build`, `lint`, `test`) and ensure pnpm setup is consistent across the repo.
- [ ] Add `.env.example` with local-only values (e.g. `API_BASE_URL`, `COPILOTKIT_AGENT_NAME`, `COPILOTKIT_RUNTIME_URL`).
- [ ] Configure ESLint/Prettier plus husky + lint-staged for pre-commit validation.

## 2. Core Architecture
- [ ] Create `/lib/api/client.ts` wrapping fetch/axios with base URL, error normalization, and future auth header hook.
- [ ] Define TypeScript models for Report, Signature, Run, RunSnapshot, RunDocument, and ValidationReport.
- [ ] Set up React Query provider and dehydrated cache bootstrap in `app/layout.tsx`.
- [ ] Implement a global store/context to track active report, run metadata, and streaming status that all pages can consume.
- [ ] Integrate CopilotKit provider configured to ingest run snapshots and share state with the chat panel.

## 3. Navigation & Routing
- [ ] Implement routes: `/reports` (default), `/reports/[reportId]/runs`, `/reports/[reportId]/runs/[runId]`.
- [ ] Ensure navigation helpers pass required params (report metadata, signature cache) to avoid redundant refetches.
- [ ] Add suspense/error boundaries for page segments and a shared loading skeleton pattern.

## 4. Reports Page
- [ ] Build table view with columns: Report Name, Latest Signature Version, Total Runs, Updated At.
- [ ] Hook table data to `GET /reports` with search + debounce query support.
- [ ] Prefetch `GET /reports/{id}/signature` when a row is hovered/clicked; navigate to runs page on selection.
- [ ] Add “Create Report” button triggering modal form that POSTs `/reports`; on success, go directly to new run chat page.
- [ ] Provide empty-state messaging, loading shimmer, and toast-driven error surfacing.

## 5. Runs Page (per report)
- [ ] Fetch report details, latest signature, and `GET /reports/{id}/runs` list (paginated or infinite if needed).
- [ ] Render table columns: Run ID, Status, Progress, Created At, Updated At.
- [ ] Display current signature panel alongside runs list with option to refresh signature.
- [ ] “Create Run” button should POST `/reports/{id}/runs`, then redirect to chat page for the returned run.
- [ ] Clicking an existing run navigates to chat page with that runId and preloads snapshot data.
- [ ] Handle empty history and error states cleanly with call-to-action to start a run.

## 6. Chat Workspace
- [ ] Layout page with responsive split: top two-thirds split vertically (left preview, right chat); bottom third for chat input + docs list.
- [ ] Left preview should show latest signature JSON by default; when a doc is selected from bottom section, swap to document preview (PDF/image/text viewer).
- [ ] Right panel hosts chat timeline (user ↔ agent) fed by CopilotKit state; include manual input box and streaming message indicators.
- [ ] Bottom third: chat input, send button, file upload area (drag/drop + multi-select) targeting `POST /runs/{runId}/upload`, list of uploaded docs with selectable rows.
- [ ] Add contextual run metadata banner (report name, run status, signature version, context notes).
- [ ] Implement `POST /runs/{runId}/start` trigger, manage disabled state until docs exist, and surface feedback on success/failure.
- [ ] Establish SSE connection (`GET /runs/{runId}/stream`) to merge snapshots into shared state; include reconnect + retry/backoff logic.
- [ ] Provide fallback polling with `GET /runs/{runId}` when SSE drops, with user notification.
- [ ] Enable “Download JSON” button calling `GET /outputs/{runId}` once run status is `done`.

## 7. Copilot & State Synchronization
- [ ] Map SSE snapshot shape to CopilotKit shared state to drive chat and UI panels.
- [ ] Implement actions/handlers for conflict resolution or validation prompts using CopilotKit UI affordances.
- [ ] Persist chat history per run so navigating back to a run rehydrates conversation.

## 8. Error Handling & Resilience
- [ ] Centralize API and SSE error handling with toast/banner + inline error components.
- [ ] Cover edge cases: 422 upload validation, 404 run expired, network loss, duplicate report names.
- [ ] Implement optimistic UI patterns where appropriate (e.g. report creation pending state) with rollback on failure.

## 9. Testing & Tooling
- [ ] Write unit/integration tests for API client and hooks using Vitest + MSW.
- [ ] Add component tests for Reports table, Runs table, and Chat layout (Playwright visual or RTL).
- [ ] Create end-to-end smoke test covering report creation → run creation → upload → start → SSE snapshot → download.
- [ ] Set up CI workflow (or local script) to run lint, typecheck, tests, and build.

## 10. Handoff & Documentation
- [ ] Prepare final implementation summary outlining architecture decisions, pending items, and testing results.
- [ ] Capture troubleshooting notes (backend offline, SSE stuck, file upload errors) in `/docs/troubleshooting.md`.
- [ ] Maintain backlog list of future enhancements (advanced conflict resolution UI, role-based access, analytics dashboards).
