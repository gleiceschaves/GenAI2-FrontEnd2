# Frontend Integration Guide

This document walks through the API flow expected in the proposal so you can wire the FE (CopilotKit UI) end to end.

## 1. Environment Set-up
- Base URL: `http://localhost:8000` (keep it configurable via `.env`).
- Use the shared Postman collection (`postman_collection.json`) for quick reference.
- Every request/stream requires no auth today, but add an axios/fetch wrapper so we can inject headers later.

## 2. Pages & Flows

### A. Report Picker / Dashboard
1. **List reports**: `GET /reports`.
   - Render name, latest signature version and run count.
   - Hook search box to `?q={term}`.
2. **Create report** (if user types a brand-new Report Name): `POST /reports` with `{ "name": "CBC-Panel" }`.
3. If user selects a report, pre-fetch the latest signature: `GET /reports/{reportId}/signature`.

### B. Run Workspace
Once a report is selected or created, create a run record immediately.
1. **Create run**:
   - Option 1 (preferred): `POST /reports/{reportId}/runs` with `{ "context": "Prefer SI units" }`.
   - Option 2 (fallback if you only have the report name): `POST /runs` with `{ "reportName": "CBC-Panel", "context": "Prefer SI units" }`.
   - Persist the returned `runId` in UI state.
2. **Upload files**: `POST /runs/{runId}/upload` (multipart form-data, key=`files`, multiple entries allowed). Show success toast with returned `docIds`.
3. **Start processing**: `POST /runs/{runId}/start`. Trigger the SSE stream immediately after you receive `{ "started": true }`.
4. **Progress stream**:
   - SSE endpoint: `GET /runs/{runId}/stream`.
   - Use browser `EventSource`. Example:
     ```ts
     const source = new EventSource(`${baseUrl}/runs/${runId}/stream`);
     source.onmessage = (event) => {
       const data = JSON.parse(event.data);
       updateCopilotState(data);
     };
     ```
   - SSE events include node names (`ingest_docs`, `ocr_extract`, `validate`, `finalize`, `error`) plus `snapshot`. Update UI by merging incoming state with local state.
5. **Snapshot polling (optional)**: If SSE ever fails, fall back to `GET /runs/{runId}` which returns the same Copilot state shape.
6. **Output download**: After status hits `done`, enable “Download JSON” by calling `GET /outputs/{runId}`.

### C. Report History page (optional)
- Use `GET /reports/{reportId}/runs` to show past runs (filters via `?status=`).
- Clicking a run should call `GET /runs/{runId}` to replay the state (no SSE needed).

## 3. Copilot State Shape
Each SSE snapshot or `GET /runs/{runId}` response looks like:
```json
{
  "report": { "id": 1, "name": "CBC-Panel", "latestSignatureVersion": 3 },
  "runId": "run_abcd",
  "status": "structuring",
  "progress": 60,
  "docs": [ { "id": "doc_1", "name": "Lab1.pdf", "ocrDone": true, ... } ],
  "context": "Prefer SI units",
  "outputJson": { ... },
  "signatureVersion": 3,
  "addedFields": [],
  "conflicts": [],
  "validationReport": { ... },
  "error": null,
  "updatedAt": "2025-10-05T18:00:00Z"
}
```
Bind this directly to CopilotKit shared state.

## 4. Handling Errors & Retries
- Upload: if `422` (no files), display validation message; otherwise, show raw error text.
- Start: if you get `404`, the run session expired—create a new run.
- SSE: close the EventSource on `error` events and fallback to polling.

## 5. Testing Checklist
1. Import the Postman collection.
2. Health check returns 200 (and `usesDatabase: true` when Postgres is active).
3. Create a report, then a run, upload at least one sample file.
4. Start the run and observe SSE events in the browser console.
5. Confirm `GET /outputs/{runId}` returns the merged JSON once status is `done`.

## 6. Notes
- The backend will persist to Postgres when `POSTGRES_*` env variables are set (pool managed server-side); without a DB it gracefully falls back to in-memory mode (cleared on restart).
- File uploads land under `storage/runs/{runId}` locally and remain available for download/debugging.
- SSE path `/runs/{runId}/stream` matches the CopilotKit convention; consume it with the standard `EventSource` helper.

