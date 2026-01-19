**Proposed Solution**

**Overview**

**Goal:** Turn many uploaded PDFs/images into **one clean JSON** that always looks the same.

**How it works in simple steps:**

- **Pick a Report Name** (or make a new one). Think of this as the _shape_ of the JSON we want.
- **Upload files** (one or many) and click Go.
- We **read text** from each file (OCR) → now we have one text for each document from docling.
- If we've seen this Report Name before, we already know the **expected JSON shape** (Signature). If not, we **create** it from the first run below.
  - IF NOT KNOWN REPROT NAME: An LLM **combines** all texts into **one JSON. We store the signature of the generated JSON in DB (step 5).**
  - IF KNOWN REPORT NAME: An LLM **combines** all texts into **one JSON** that matches the shape from DB. It can **ONLY** **add new fields** if it finds new info, but it **can't change or remove** old ones. We then persist the new signature (including new fields if any) to the DB **(step 5).**
- We **save** the JSON and **update** the shape with any _new_ fields.

**Why this is useful:**

- You always get **one final JSON**.
- The JSON stays **compatible over time** (it only grows; it doesn't break old code).
- If needed later, we can add a simple review step for humans in the backend using LangGraph.

**Simple Flow Diagram**

\[User picks/creates Report Name\]

|

\[Upload files\]

|

\[OCR each\]

|

\[Have signature?\]

/ \\

Yes No

| |

\[Load signature\] \[Make first signature\]

\\ /

\[LLM merges into one JSON\]

|

\[Validate + Save Output\]

|

\[Append-only update to signature\]

|

\[Return JSON\]

We introduce a **JSON Signature Pipeline** that separates: (1) OCR/extraction, (2) schema synthesis, and (3) constrained structuring with **backward‑compatible evolution**.

**User flow**

- **Choose or create a Report Name** (e.g., "CBC‑Panel‑v1").
- **Upload** one or more documents + optional free‑text context/instructions.
- Backend runs OCR (Docling/Landing AI) → per‑document **clean text blocks** and any native KV tables.
- If **Report Name exists**: fetch its **JSON Signature** (field paths + types + invariants).  
    If **new**: synthesize a first signature from the current submission.
- Use an **LLM structurer** with a constrained prompt to produce a **single merged JSON**:
  - If signature exists, the LLM **must** adhere to it; it **may add** new fields (append‑only) with clear typing and description.
  - If signature is new, the LLM **proposes** a canonical, production‑ready schema (normalized names, units, types), merging all docs without loss.
- Persist the **output JSON** and update the **Signature** (append-only evolution with versioning, diffs, and approvals if required).
- Optional **HITL review** UI allows users to edit values/structure; approved edits feed back into the signature (pending policy).

**Prompting patterns (LLM structurer)**

- **New Report Name (bootstrap)**
  - _System goal_: "Synthesize a canonical JSON schema and merged output from N documents. Do not lose information. Normalize names/units. Emit both schema_proposal and output_json."
  - _User content_: {reportName, docs:\[{id, text, meta}\], context}
  - _Constraints_: deterministic keys; ISO dates; canonical units; include per-field provenance.
- **Existing Report Name (constrained)**
  - _System goal_: "Given Signature S, **must** match existing fields exactly (names/paths/types). You **may add** fields; do **not** modify or remove. Emit output_json and added_fields\[\]."
  - _Constraints_: "Given Signature S, you MUST keep existing field paths/types. You MAY append new fields. Do not rename/remove. Return output_json + added_fields\[\] + validation_report."
- **Validation**: Instruct the model to produce a validation_report (flag missing required fields, out-of-range values, unit coercions, conflicts).

**JSON Signature: definition & evolution**

- **What is a Signature?** A compact, canonical schema definition: field path, data type, cardinality, allowed values/units, description, and validation rules. Example:

{

"name": "CBC-Panel-v1",

"version": 3,

"fields": \[

{"path": "patient.id", "type": "string", "required": true, "desc": "MRN or UUID"},

{"path": "patient.dob", "type": "date", "format": "YYYY-MM-DD"},

{"path": "labs.wbc.value", "type": "number", "units": \["10^3/uL"\], "range": \[3.5, 11.0\]},

{"path": "labs.wbc.source", "type": "provenance"}

\],

"constraints": {"noBreakingRemoval": true, "noRename": true},

"policies": {"unitCanonical": "SI-preferred", "merge": "mostRecentWins"}

}

- **Evolution rules**:
  - **Append‑only**: allow _adding_ new fields; **no removal/rename** of existing paths to maintain backward compatibility.
  - **Versioning**: bump version on any change; store a diff (addedFields, changedConstraints).

**OPTIONAL: Multi‑document merge strategies**

- **Most‑Recent‑Wins** (default for time‑series clinical values).
- **Source‑Preference** (prioritize EHR over scanned PDF).
- **Aggregate Arrays** (collect from all docs with provenance).
- **Conflict Flags**: if values disagree beyond tolerance, surface conflicts\[\] for HITL.

**OPTIONAL: Where RAG fits**

- **Normalization memory**: retrieve prior _approved_ examples for a given Report Name to guide naming/units.
- **Domain knowledge**: retrieve lab reference ranges, coding dictionaries, and aliases to validate & map.
- **FAQ/Instructions aid**: guide end‑users in the app (tooltips, autocomplete) from a knowledge base.

**Implementation Specifics**

**Tech stack**

- **Frontend**: Next.js + CopilotKit (AG‑UI specs). Users can:
  - Upload documents (multi-select), view OCR snippets, inspect/compare JSON, correct values.
  - Select/create Report Name, see Signature versions & diffs.
  - Real‑time status via sockets (upload → OCR → structuring → validation → ready).
- **Backend**: LangGraph service (or FastAPI/Django) orchestrating tools:
  - **Docling/Landing AI OCR** microservice (containerized).
  - **LLM structurer** tool (OpenAI/Azure/Open‑source) with retry, cost/latency logging.
  - **Postgres** for: Signatures, Versions, Diffs, Runs, Provenance, and Audit.
  - Optional **Postgres RAG extension: for domain glossaries, approved examples, and alias dictionaries.**

**Data model (Postgres)**

- report_names(id, name, created_at, created_by)
- signatures(id, report_name_id, version, jsonb signature, status, approved_by, approved_at)
- OPTIONAL:signature_diffs(id, report_name_id, from_version, to_version, jsonb diff) . We can also just change the existing signature
- runs(id, report_name_id, signature_version, status, cost_cents, latency_ms, created_at)
- documents(id, run_id, filename, pages, hash, storage_uri, ocr_engine, ocr_jsonb)
- outputs(id, run_id, jsonb output, jsonb validation_report)

**LangGraph Outline (nodes)**

- ingestDocs → store & hash files, emit doc IDs.
- ocrExtract (per‑doc) → text/KV payloads + confidence.
- preNormalize → light cleaning, unit hints, alias candidates.
- loadSignature → fetch by Report Name (or null).
- llmStructure → prompt (bootstrap vs constrained), produce output_json, added_fields\[\], validation_report.
- validate → typed checks (JSON Schema), regex/unit, range checks; attach provenance; compute conflicts.
- finalize → persist output, update Signature (append-only), emit proposal for approval if governance enabled.
- notify → websocket events to FE.

**OPTIONAL: HITL & governance**

- Inline JSON editor with **field‑level provenance** and **confidence badges**.
- **Review queues** for conflicts and low‑confidence fields.
- **Signature change control**: propose → review → approve → publish.

**Testing & quality gates**

- **Metrics**: field coverage, exact‑match rate, unit normalization rate, avg confidence, human edit rate.
- **Guardrails**: block release if exact‑match rate < threshold for critical fields.

**Concrete Example (CBC Panel)**

**Signature v1 (excerpt)**

{

"name": "CBC-Panel",

"version": 1,

"fields": \[

{"path": "patient.id", "type": "string", "required": true},

{"path": "patient.dob", "type": "date", "format": "YYYY-MM-DD"},

{"path": "labs.wbc.value", "type": "number", "units": \["10^3/uL"\], "range": \[3.5, 11.0\]},

{"path": "labs.wbc.takenAt", "type": "datetime"},

{"path": "labs.wbc.source", "type": "provenance"}

\]

}

**Merged output (sample)**

{

"patient": {

"id": "MRN-12345",

"dob": "1995-07-14"

},

"labs": {

"wbc": {"value": 6.8, "units": "10^3/uL", "takenAt": "2025-10-04T09:30:00Z", "source": {"docId": "fileA.pdf", "page": 2}}

},

"conflicts": \[\],

"added_fields": \[\]

}

**JSON Schema (machine‑validatable draft)**

{

"\$schema": "<http://json-schema.org/draft-07/schema#>",

"title": "CBC-Panel",

"type": "object",

"required": \["patient", "labs"\],

"properties": {

"patient": {

"type": "object",

"required": \["id"\],

"properties": {

"id": {"type": "string"},

"dob": {"type": "string", "pattern": "^\\d{4}-\\d{2}-\\d{2}\$"}

}

},

"labs": {

"type": "object",

"properties": {

"wbc": {

"type": "object",

"properties": {

"value": {"type": "number"},

"units": {"type": "string", "enum": \["10^3/uL"\]},

"takenAt": {"type": "string", "format": "date-time"},

"source": {"type": "object"}

}

}

}

}

}

}

**OPTIONAL: HITL Feedback Contract (API)**

**POST** /feedback

{

"reportName": "CBC-Panel",

"signatureVersion": 1,

"runId": "run_01HZX...",

"edits": \[

{

"path": "labs.wbc.value",

"old": 6.8,

"new": 6.6,

"reason": "Transcription correction",

"severity": "minor"

}

\]

}

- Persist edit, re‑validate, recalc conflicts, optionally propose signature update (append‑only).

**OPTIONAL: Observability**

- Emit per‑step spans (ingest, ocr, structuring, validation).
- Attach runId to all logs/rows; store prompts/outputs with hashes.
- Dashboards: cost per reportName, edit hotspots, failure modes.

**Tasks (Prioritized for Hackathon)**

**Keep it scrappy. Aim for a working demo.**

- **Happy‑Path Upload → One JSON (MVP)**
  - FE: page to pick/create Report Name, upload multiple files, show final JSON.
  - BE: endpoint to accept files + context; run OCR; call LLM to merge; return JSON.
- **Signature Store (Append‑Only)**
  - Postgres table for {reportName, version, signature_json}.
  - If new name → create signature from first run. If existing → enforce paths/types; allow only new fields.
- **Basic Validation**
  - JSON Schema check (types, required fields).
  - Minimal unit/date normalization (ISO date string, basic number parsing).
- **Provenance Lite**
  - For each key field, keep {docId, page?} so users can trace where a value came from.
- **OCR Adapter (Docling/Landing AI)**
  - Simple wrapper that returns text per file. Log confidence if available.
- **LLM Prompts (2 modes)**
  - **Bootstrap:** create initial signature + merged JSON.
  - **Constrained:** follow existing signature; append new fields only.
- **Status & Errors**
  - FE progress states (Uploading → OCR → Merging → Done / Error).
  - BE logs with runId and simple error messages.
- **Nice‑to‑Have (time permitting)**
  - Minimal HITL: inline JSON editor; POST back corrections.
  - Download output JSON button; copy‑to‑clipboard.
  - Tiny metrics: count of runs, avg pages/run.

**Cut if needed:** RAG, multi‑engine OCR, governance/approvals, complex unit maps.

**What to Demo**

- Upload 2-3 files for "CBC‑Panel".
- Show one final JSON and the signature version.
- Re‑run with different docs → same fields + any new ones appended.
- Click a value to reveal its source doc id (provenance lite).

\# Implementation specifics

# LangGraph plan (nodes, edges, IO)

**State shape (internal graph state)**

from typing import TypedDict, Literal, Optional, List, Dict, Any

Status = Literal\["idle","uploading","ocr","structuring","validating","finalizing","done","error"\]

class Doc(TypedDict):

id: str # our uuid for this file

name: str # filename

pages: Optional\[int\]

storage_uri: Optional\[str\]

hash: Optional\[str\]

ocr_text: Optional\[str\] # plain text

ocr_meta: Optional\[Dict\[str, Any\]\]

class GraphState(TypedDict):

run_id: str

report_name: str

docs: List\[Doc\]

context: Optional\[str\] # free-text hints from user

signature: Optional\[Dict\[str, Any\]\] # loaded signature (if exists)

signature_version: Optional\[int\]

output_json: Optional\[Dict\[str, Any\]\]

added_fields: List\[Dict\[str, Any\]\]

validation_report: Optional\[Dict\[str, Any\]\]

conflicts: List\[Dict\[str, Any\]\]

status: Status

error: Optional\[str\]

**Nodes**

- **ingest_docs**

- Input: files (already uploaded via API), report_name, context
- Work: hash, store, create Doc\[\], set run_id
- Output: docs\[\], status="ocr"

- **ocr_extract (map over docs)**

- Input: docs\[\]
- Work: call OCR (Docling adapter) → ocr_text, ocr_meta per doc
- Output: updated docs\[\]; status="structuring"

- **load_signature**

- Input: report_name
- Work: fetch latest signature row from Postgres (if any)
- Output: signature, signature_version or None

4A) **llm_structure_bootstrap** (if no signature)

- Input: docs\[\].ocr_text, context
- Output: output_json, **initial** signature proposal (canonical fields), added_fields=\[\], status="validating"

4B) **llm_structure_constrained** (if signature exists)

- Input: docs\[\].ocr_text, context, signature
- Output: output_json (must match signature), added_fields (append-only), status="validating"

- **validate**

- Input: output_json, signature
- Work: type checks (JSON Schema), ISO dates/units normalization, conflict detection
- Output: validation_report, conflicts\[\], status="finalizing"

- **finalize**

- Work: persist outputs, documents, runs; if added_fields not empty → append-only update to signatures (+ bump version)
- Output: signature_version (final), status="done"

- **notify** (optional, for streaming UI)

- Emit step events/partials to SSE (progress, node boundaries, diffs)

**Edges**

- ingest_docs → ocr_extract → load_signature → (llm_structure_bootstrap | llm_structure_constrained) → validate → finalize → notify

# CopilotKit shared state (frontend-backend contract)

This is the **single source of truth** the FE will mirror. We'll expose a /runs/:id/state GET and stream updates on /runs/:id/stream (SSE). FE's Copilot (local) can bind to this shape.

type CopilotState = {

// New

report: {

id: number | null,

name: string | null,

latestSignatureVersion: number | null

};

// Existing

runId: string | null,

status: "idle" | "uploading" | "ocr" | "structuring" | "validating" | "finalizing" | "done" | "error",

progress: number, // 0..100

docs: Array&lt;{ id: string, name: string, pages?: number, ocrDone?: boolean }&gt;,

outputJson: Record&lt;string, any&gt; | null,

signatureVersion: number | null,

addedFields: Array&lt;{ path: string, type: string, desc?: string }&gt;,

conflicts: Array&lt;{ path: string, values: any\[\], reason?: string }&gt;,

validationReport: Record&lt;string, any&gt; | null,

error?: string

};**Events we'll stream (SSE)**

- status: "uploading" | "ocr" | "structuring" | "validating" | "finalizing" | "done" | "error"

 report-selected: { id, name, latestSignatureVersion }

- progress: number
- doc-ocr-progress: {docId, page, pages}
- output-json: {...}
- added-fields: \[...\]
- conflicts: \[...\]
- signature-updated: {version}
- error: {message}

# Minimal HTTP surface (backend)

- POST /runs  
    body: { reportName: string, context?: string } → { runId }
- POST /runs/: runId/upload (multipart)  
    attach N files
- POST /runs/: runId/start  
    kicks the graph (or auto-start after upload)
- GET /runs/:runId  
    returns current snapshot of CopilotState
- GET /runs/:runId/stream  
    SSE stream of events
- GET /outputs/:runId  
    merged output JSON

(You already have /graph/invoke and /graph/stream-we can either reuse those or expose the above "friendly" endpoints that call into the graph.)

# Copilot ↔ Backend contracts (payloads)

4.1 Reports (new)

GET /reports

Query params: q? (substring search), page?, limit?

Response:

{

"items": \[

{

"id": 12,

"name": "CBC-Panel",

"latestSignatureVersion": 4,

"runsCount": 27,

"createdAt": "2025-09-28T18:22:11Z"

}

\],

"page": 1, "limit": 50, "total": 1

}

POST /reports

Body: { "name": "CBC-Panel" }

Response: { "id": 12, "name": "CBC-Panel", "latestSignatureVersion": null, "runsCount": 0 }

Notes: name must be unique (we already enforce at DB). If exists → 409.

GET /reports/:reportId

Response:

{

"id": 12,

"name": "CBC-Panel",

"latestSignatureVersion": 4,

"runsCount": 27,

"createdAt": "2025-09-28T18:22:11Z"

}

GET /reports/:reportId/signature

Returns latest signature for this report (or 204 if none):

{ "version": 4, "signature": { /\* json schema-like \*/ }, "status": "active", "approvedBy": null, "approvedAt": null }

POST /reports/:reportId/signature

Use only when proposing or appending fields; backend enforces append-only:

{ "signature": { /\* full signature object to set as next version \*/ }, "status": "proposed" }

Response: { "version": 5, "status": "proposed" }

(Optional later) PATCH to approve/activate.

GET /reports/:reportId/runs

Query: status?=done|error|..., page?, limit?

Response:

{

"items": \[

{ "runId": "run_01J...", "status": "done", "signatureVersion": 4, "createdAt": "2025-10-05T18:50:00Z" }

\],

"page": 1, "limit": 50, "total": 27

}

4.2 Runs (scoped under a report)

POST /reports/:reportId/runs

Body:

{ "context": "Prefer SI units; patient MRN in patient.id" }

Response:

{ "runId": "run_01J...", "report": { "id": 12, "name": "CBC-Panel", "latestSignatureVersion": 4 } }

GET /runs/:runId

(snapshot of CopilotState fields relevant to this run)

{

"report": { "id": 12, "name": "CBC-Panel", "latestSignatureVersion": 4 },

"runId": "run_01J...",

"status": "uploading",

"progress": 10,

"signatureVersion": 4,

"docs": \[ ... \],

"outputJson": null,

"addedFields": \[\],

"conflicts": \[\],

"validationReport": null

}

**Upload files**

POST /runs/:runId/upload

Content-Type: multipart/form-data

files\[\]=a.pdf

files\[\]=b.jpg

→ { ok: true, docIds: \["doc1","doc2"\] }

**Kick processing**

POST /runs/:runId/start

→ { started: true }

**Subscribe to progress**

GET /runs/:runId/stream (SSE)

event: status

data: {"status":"ocr","progress":20}

...

event: output-json

data: {...}