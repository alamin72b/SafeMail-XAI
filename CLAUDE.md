# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository shape

This is **three independent projects** in one repo, not an npm workspace — each has its own `node_modules`/`package-lock.json` and must be built/run from its own directory:

- `backend/` — NestJS inference API (loads an ONNX spam-classification model)
- `frontend/` — Next.js web UI that hits the backend directly for manual testing/demo
- `spam-guard-extension/` — Manifest V3 Chrome extension that scans Gmail and hits the same backend

Root-level `package.json`/`eslint.config.mjs` only cover stray files at the repo root; its ESLint config explicitly ignores all three subprojects (`backend/**`, `frontend/**`, `spam-guard-extension/**`), each of which has its own ESLint config.

## Commands

### Backend (`backend/`)
```
npm run start:dev    # builds (tsc) then runs dist/main.js on :4000, killing any existing process on that port first
npm run build         # tsc -p tsconfig.build.json
npm run start:prod    # runs the already-built dist/main.js, no rebuild/port-kill
```
No test runner is actually wired up: `.spec.ts` files exist under `src/` and `test/jest-e2e.json` exists, but `jest` is not a devDependency and there is no `test` script in `backend/package.json`. Don't assume `npm run test` works — it would need jest added first.

### Frontend (`frontend/`)
```
npm run dev      # http://localhost:3000
npm run build
npm run start
```
No `lint` script is defined; run `npx eslint .` manually if needed.

### Extension (`spam-guard-extension/`)
```
npm run build       # esbuild bundles 4 entry points into dist/, then copies public/ into dist/
npm run typecheck   # tsc --noEmit
npm run lint        # eslint .
npm run format      # eslint . --fix
```
After building, load `spam-guard-extension/dist/` as an unpacked extension via `chrome://extensions` (Developer mode → Load unpacked). Reload the extension card after every rebuild.

## Architecture

### End-to-end data flow
Gmail DOM → `content-script.ts` extracts subject/body → `chrome.runtime.sendMessage` → `service-worker.ts` (background) → SHA-256 hash as LRU cache key → `api-client.ts` → `POST {apiBaseUrl}/spam-detection/classify` on the NestJS backend → ONNX inference → response cached and appended to scan history → badge rendered next to the email subject.

The Next.js frontend is a separate, standalone path to the same backend endpoint (`EmailIntakeForm` → `lib/api.ts#classifyEmail` → `ConfidenceGauge`/`AnalysisBreakdown`) — it does not go through the extension at all.

### Backend (`backend/src/`)
- `main.ts` sets a global prefix `api/v1`, a global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`), and CORS: open (`origin: true`) outside production, restricted to `process.env.EXTENSION_ORIGIN` (the extension's `chrome-extension://` origin) in production.
- Single feature module, `spam-detection/`:
  - `spam-detection.controller.ts`: `POST /api/v1/spam-detection/classify` (body validated by `ClassifyEmailDto`, max 100,000 chars), `GET /api/v1/spam-detection/health`.
  - `spam-detection.service.ts`: loads the ONNX model from `MODEL_PATH` env or `backend/models/model.onnx` via `onnxruntime-node`, tokenizes with `@xenova/transformers` `AutoTokenizer` (`TOKENIZER_ID` env, default `Xenova/xlm-roberta-base`), forces a fixed `[1, 128]` input (`padding: 'max_length'`, `truncation: true`), runs inference, and softmaxes the 2 logits. Index 0 = ham, index 1 = spam — this ordering is called out inline as "ALIGNED WITH COLAB" and must not be flipped without re-checking the model's training setup. Threshold is a hardcoded `0.5`.
  - `backend/models/model.onnx` is an external binary artifact, not something generated from this source tree.

### Frontend (`frontend/`)
- App Router: `app/page.tsx` composes `EmailIntakeForm`, `ConfidenceGauge`, `AnalysisBreakdown`.
- `lib/api.ts#classifyEmail` wraps `fetch` to the backend and throws a typed `ApiError` on network failure or non-OK response.
- `lib/types.ts` mirrors the backend's response shape (`ClassificationResponse`) field-for-field — keep this in sync by hand if the backend's DTO/controller response shape changes.
- Backend base URL comes from `NEXT_PUBLIC_API_BASE_URL` (set in `frontend/.env.local`, not committed), falling back to `http://localhost:4000/api/v1`.
- `components/FusionWeightPanel.tsx` currently exists as an empty file (unimplemented).

### Extension (`spam-guard-extension/src/`)
- `build.mjs` produces four independent esbuild bundles into `dist/`: `service-worker.js` (ESM), `content-script.js`, `popup.js`, `options.js` (all IIFE), then copies `public/` (manifest, HTML, CSS) into `dist/` unchanged.
- `content/content-script.ts`: watches the Gmail DOM with a `MutationObserver`, debounces scans (400ms), extracts the open email via `content/email-extractor.ts`, and renders a checking/verdict/unavailable badge (`content/badge.ts`) next to the subject.
- `background/service-worker.ts`: receives `PREDICT_EMAIL` runtime messages, hashes the email body with SHA-256 (`background/hash.ts`) as a key into a capacity-100 LRU cache (`background/lru-cache.ts`) to avoid redundant API calls, calls `background/api-client.ts#predictSpam` against the base URL from `shared/settings.ts`, and appends results to scan history (`shared/history.ts`).
- `shared/settings.ts`: API base URL is user-configurable (options page) via `chrome.storage.sync`, defaulting to `http://localhost:4000/api/v1`.
- `shared/types.ts` defines the extension's own copy of the backend's response shape with runtime type guards (e.g. `isBackendClassificationResponse`) — messages crossing extension contexts (and the backend's actual JSON) aren't statically type-checked, so this must be kept in sync with the backend contract by hand, the same way `frontend/lib/types.ts` is.
- `shared/messages.ts` defines the typed runtime message protocol (`PredictEmailRequest` / `PredictionResponse`) shared between content script, popup, and service worker.
- `explainability/`: pluggable explanation-provider abstraction (`explanation-provider.ts`, `render-explanation.ts`); currently only a `PlaceholderExplanationProvider` exists — this is where model-explainability (XAI) output would be wired in.
- `public/manifest.json` `host_permissions` are locked to `https://mail.google.com/*` and `http://localhost:4000/*` — pointing the extension at a non-localhost backend requires updating this file (and typically `EXTENSION_ORIGIN` on the backend side for CORS).

## Code style

Each of the three projects has its own ESLint config — settings don't carry over between them:
- `spam-guard-extension/eslint.config.mjs`: strict `@stylistic` rules (2-space indent, single quotes, required semicolons, one function-call argument per line via `@stylistic/function-call-argument-newline`, 80-char max line length, import sorting via `eslint-plugin-simple-import-sort`). Run `npm run format` before committing here — the argument-per-line and indent rules are easy to violate by hand.
- `backend/eslint.config.mjs`: `typescript-eslint` `recommendedTypeChecked` + `eslint-plugin-prettier`.
- `frontend/eslint.config.mjs`: `eslint-config-next` (`core-web-vitals` + `typescript`).

## Environment variables

None of these are committed; set them per environment:
- Backend: `PORT` (default 4000), `MODEL_PATH`, `TOKENIZER_ID`, `TOKENIZER_CACHE_DIR`, `EXTENSION_ORIGIN` (production CORS origin).
- Frontend: `NEXT_PUBLIC_API_BASE_URL` (in `frontend/.env.local`).
- Extension: no build-time env vars — the API base URL is runtime-configurable through the options page (`chrome.storage.sync`), not a `.env` file.
