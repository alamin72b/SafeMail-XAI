# Agent Development Guide

## Essential Commands

### Backend (NestJS)
- `npm run build` – Compile TypeScript (`src/` → `dist/`) using `tsc`.
- `npm run start` – Run compiled application (`dist/main.js`). Automatically kills any process on port 4000 before starting.
- `npm run start:dev` – Same as `start` (used for development).
- `npm run start:prod` – Run production build (`node dist/main.js`).
- `npm run test` – Run unit tests (`jest`).
- `npm run test:e2e` – Run end‑to‑end tests using Jest config `test/jest-e2e.json`.
- `npm run test:cov` – Run tests with coverage collection.

> Important: Environment variables for the backend are loaded via Nest's `ConfigModule`. Set them in a `.env` file at the project root or provide them via the system environment.

### Frontend (Next.js)
- `npm run dev` – Start development server (`http://localhost:3000`).
- `npm run build` – Production build.
- `npm run start` – Serve built app. Reads `BASE_URL` from `process.env.NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:4000/api/v1`).
- No built‑in `lint` script; linting is configured via `.eslintrc.mjs` but must be run manually (`npx eslint .`).

### Chrome Extension
- Build scripts are in `spam-guard-extension/package.json` (`build.mjs`). Typically you run a bundler like `web_ext` or load the `public/` directory unpacked in Chrome.
- No root‑level commands; use the extension's own `npm` scripts if needed.

## Project Architecture

### Backend
- **Feature‑first layout**: each domain (e.g., `spam-detection`) lives in its own folder under `src/`.
  - `controller.ts` – REST route handlers (`@Controller`).
  - `service.ts` – Business logic (`@Injectable`).
  - `dto/` – Data Transfer Objects with class‑validator decorators.
  - `interfaces/` – TypeScript interfaces.
  - `module.ts` – Nest module exporting providers.
- **Dependency injection**: services are provided via constructor injection.
- **RxJS streams** – used for asynchronous processing; ensure unsubscription to avoid leaks.
- **Model**: ONNX inference performed via `@xenova/transformers` and `onnxruntime-node`. Model file resides at `backend/models/model.onnx`.

### Frontend
- **Next.js pages** in `app/` (`page.tsx`, `layout.tsx`).
- **Shared UI** in `components/`.
- **API client** in `lib/api.ts`: typed wrapper around `fetch` that validates errors and throws `ApiError`.
- **Types** in `lib/types.ts`: `ClassifyRequest`, `ClassificationResponse`, etc.
- **Styling**: Tailwind CSS with utility‑first classes; configuration in `tailwind.config.ts`.

### Chrome Extension
- **Manifest**: placed in `spam-guard-extension/public/manifest.json`.
- **Background** (`service-worker.ts`): event listeners for messaging and caching.
- **Popup UI** (`popup/`): React components rendered in extension UI.
- **Content scripts** (`content/`): injected into web pages to extract email metadata.
- **Communication**: Uses `chrome.runtime.sendMessage` / `onMessage` between background, popup, and content scripts.

## API Contract

- Backend endpoint: `POST {BASE_URL}/spam-detection/classify`
- Request body: `{ body: string }` (`ClassifyRequest`).
- Response: `{ verdict: 'SPAM' | 'HAM'; spamProbability: number; ... }` (`ClassificationResponse`).
- Errors are wrapped in `ApiError` on the frontend; backend uses Nest default error format.

## Testing Conventions

- Tests live under `backend/test/` with `.spec.ts` suffix.
- Use Jest with the `test/jest-e2e.json` config for e2e scenarios.
- Mock the tokenizer service (`tokenizer.service.ts`) to isolate unit tests.
- Begin unit tests with `describe('SpamDetectionService', ...)`; use `beforeAll` to compile Nest testing module.

## Gotchas & Tips

- **Port Management** – `npm run start` kills any process on port 4000. If you change the backend port, update both backend scripts and the `NEXT_PUBLIC_API_BASE_URL` in `.env.local`.
- **Environment Variables** – Do **not** commit `.env` files. Add them to `.gitignore`. The frontend expects `NEXT_PUBLIC_API_BASE_URL`; missing variable results in a hard‑coded fallback URL.
- **Cache Warm‑up** – The first ONNX inference can take several seconds. For dev workflows, keep the backend running to avoid repeated warm‑up.
- **LRU Cache** – The extension and backend both use an LRU cache (`lru-cache.ts`). Cache size defaults to 1000 entries; adjust if you observe memory bloat.
- **Message Passing** – In the extension, background ↔️ popup communication uses `chrome.runtime.sendMessage`. Ensure message payloads are serializable (no functions, BigInt, etc.).
- **Type Import Paths** – When importing types across packages, use absolute imports (`@/types/...`) configured in `tsconfig.json` if applicable; otherwise relative paths are preferred.
- **File Watchers** – `npm run dev` for the frontend watches files and restarts automatically. If you add new folders, ensure they are included in the `pages` directory or they won't be picked up.
- **Next.js API Routes** – If you create API routes under `pages/api/`, they are proxied to the same server. Do not expose them unintentionally; they are separate from the Nest backend.

## Code Style & Conventions

- **Naming**: 
  - Files and folders: kebab‑case.
  - Classes: PascalCase.
  - Functions/variables: camelCase.
  - Interfaces: end with `Interface` or prefix with `I` (e.g., `IEmail`).
- **Decorator Order** (NestJS): `@Injectable` → `@Controller` → `@Get/@Post` → `@Parameter` → `@Body` → `@ReturnTypeService`.
- **Class‑Validator** – Validate DTO fields using decorators; never rely on runtime validation only.
- **Type Safety** – All public APIs are fully typed; avoid `any` unless absolutely necessary.
- **Error Handling** – Throw `ApiError` with status code and human‑readable message; frontend converts these to UI alerts.

## Releasing Changes

- Follow conventional commit messages (`feat:`, `fix:`, `docs:`). Automated release scripts (e.g., `standard-version`) are configured in `backend/package.json`.
- Update version in `backend/package.json` and commit the changelog.
- Tag the new version and push to origin; CI will trigger build and deployment pipelines.

--- 

> **Note for new agents:** Most of the above commands assume you are at the repository root and have the relevant `npm` workspaces installed. Use `npm install` in each subdirectory (`backend`, `frontend`, `spam-guard-extension`) to ensure all dependencies are present. When in doubt, consult the relevant `package.json` scripts and `.env` files.