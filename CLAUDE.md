# CLAUDE.md - Maquetto Development Guide

## Project Summary

**Maquetto** — Browser-only AI-powered CAD IDE for Build123d. Users write Python CAD code, see real-time 3D previews, and use AI to modify designs through natural language with spatial context from the viewport.

**Owner**: Paul Fremantle (pzfreo)
**Spec**: See `maquetto-spec.md` for the full product specification.

## Be a Critical Design Partner

Don't be a cheerleader. Be a thoughtful, constructive critic:

- **Challenge assumptions**: If a proposed approach seems suboptimal, say so with reasoning.
- **Question complexity**: Push back on over-engineering. Ask "do we really need this?"
- **Identify trade-offs**: Lay out pros and cons honestly when there are multiple approaches.
- **Flag risks**: Point out potential issues early — maintenance burden, performance, edge cases.
- **Disagree respectfully**: A good "no" or "have you considered..." is more valuable than blind agreement.

---

## Architecture (Three Layers — Strict Boundaries)

```
┌─────────────────────────────────────────────────┐
│  UI Layer (React + TypeScript)                  │
│  Editor │ Viewport │ Chat │ Toolbar             │
│  Depends ONLY on CadEngine interface +          │
│  Vercel AI SDK provider interface               │
└─────────────┬───────────────────┬───────────────┘
              │                   │
    ┌─────────▼─────────┐  ┌─────▼──────────────┐
    │  CAD Engine        │  │  AI Layer           │
    │  (Web Worker)      │  │  (Vercel AI SDK)    │
    │  Pyodide + OCP.wasm│  │  Google / Anthropic │
    │  + Build123d       │  │  via ChatTransport  │
    └────────────────────┘  └─────────────────────┘
```

**Critical rules:**
- UI layer NEVER references Web Workers, postMessage, Pyodide, or AI provider specifics
- UI depends on `CadEngine` interface — swapping to HTTP backend requires zero UI changes
- AI is provider-agnostic via Vercel AI SDK `ChatTransport` — adding a provider = one npm package + registry entry
- Errors are structured data (`CompileError`, `EngineError`), never thrown across boundaries

## Project Structure (pnpm Monorepo)

```
packages/
├── api-types/        # Shared TypeScript types — single source of truth
│   └── src/
│       ├── engine.ts        # CadEngine interface, EngineStatus, CompileResult, PartMetadata
│       ├── worker-protocol.ts  # WorkerRequest / WorkerResponse message types
│       ├── ai.ts            # AIProviderType, CADContext, CodeBlock
│       ├── store.ts         # Zustand slice types (AppStore)
│       ├── colors.ts        # 12-color palette
│       └── index.ts         # Barrel re-exports
│
├── frontend/         # React app (Vite)
│   ├── src/
│   │   ├── engine/          # CadEngine implementations
│   │   │   ├── create-worker-engine.ts  # Web Worker wrapper
│   │   │   └── cad-worker.ts            # Worker entry (Pyodide + OCP.wasm)
│   │   ├── ai/             # AI provider transports, context assembly
│   │   ├── store/          # Zustand slices
│   │   ├── hooks/          # useEngine, useCompilation, useCADChat
│   │   └── components/     # Editor, Viewport, Chat, Layout, Toolbar
│   └── public/
│       └── sw.js           # Service worker for WASM caching
│
└── api-proxy/        # Reserved for future use (e.g. OpenAI CORS proxy)
```

## Tech Stack

| Tool | Version | Purpose |
|------|---------|---------|
| Node | 22+ | Runtime |
| pnpm | 9+ | Package manager |
| React | 19 | UI framework |
| TypeScript | 5.5+ | Type safety |
| Vite | 6+ | Build tool |
| Three.js | r170+ | 3D rendering (via @react-three/fiber + drei) |
| Monaco | latest | Code editor |
| Zustand | 5+ | State management |
| Vercel AI SDK | latest | AI provider abstraction |
| Pyodide | 0.29.x | Python in WASM (CDN) |
| OCP.wasm | latest | OpenCASCADE for WASM (via micropip) |
| Build123d | 0.10+ | CAD library (via micropip) |
| Vitest | latest | Testing |

---

## STOP — Critical Rules

### 1. Types Are the Constitution

The `@maquetto/api-types` package is the single source of truth for ALL typed communication between layers. **No `any` in TypeScript.** If you need to change a data shape crossing a boundary:

1. Edit the type in `packages/api-types/src/`
2. `pnpm typecheck` must pass
3. Update all consumers
4. Commit types + consumers together

### 2. Engine Abstraction Is Sacred

The UI imports the `CadEngine` **interface**, never the Web Worker implementation. Never use `postMessage`, `Worker`, or Pyodide APIs in UI code. Test: "Could I swap this to an HTTP backend with zero UI changes?" If no, you've violated the abstraction.

### 3. Provider Abstraction Is Sacred

Chat UI, context assembly, and response parsing NEVER reference Google, Anthropic, or any provider directly. All provider differences are handled by `ChatTransport` implementations and the Vercel AI SDK. Test: "Could I add a new AI provider by installing one package and adding a registry entry?" If no, you've violated the abstraction.

---

## Pyodide + OCP.wasm Loading (Hard-Won Knowledge)

**Reference implementation**: See `pzfreo/wormgear` repo (`web/generator-worker.js`).

### Loading Sequence (Critical — Order Matters)

```javascript
// 1. Load Pyodide
self.importScripts('https://cdn.jsdelivr.net/pyodide/v0.29.0/full/pyodide.js');
pyodide = await loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.0/full/",
});

// 2. Load micropip + pydantic
await pyodide.loadPackage(['micropip', 'pydantic']);

// 3. Set custom index for OCP.wasm (NOT on PyPI)
const micropip = pyodide.pyimport('micropip');
micropip.set_index_urls([
    "https://yeicor.github.io/OCP.wasm",
    "https://pypi.org/simple"
]);

// 4. Install lib3mf
await micropip.install('lib3mf');

// 5. Mock py-lib3mf (build123d expects it as separate module)
micropip.add_mock_package("py-lib3mf", "2.4.1",
    modules={"py_lib3mf": 'from lib3mf import *'});

// 6. Install ocp_vscode from Jojain's fork (no PyPerclip)
await micropip.install(
    "https://raw.githubusercontent.com/Jojain/vscode-ocp-cad-viewer/no_pyperclip/..."
);

// 7. Install build123d + sqlite3
await micropip.install('build123d');
await micropip.install('sqlite3');
```

### Why This Sequence Exists

- **Custom index**: OCP.wasm has pre-compiled WASM binaries hosted on GitHub Pages, not PyPI
- **py-lib3mf mock**: build123d imports `py_lib3mf` but it doesn't exist as a separate WASM package — mock it with lib3mf re-export
- **Jojain's fork**: Original ocp_vscode imports PyPerclip which fails in WASM (no system clipboard)
- **pydantic via loadPackage**: Pydantic v2 needs pydantic-core (Rust extension) — MUST use Pyodide's bundled version, not micropip

### COOP/COEP Headers (Non-Negotiable)

Pyodide requires `SharedArrayBuffer`, which requires these headers on EVERY response:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Set in: Vite config (`server.headers`), `vercel.json`, and any production hosting.

### glTF Export from Pyodide

Build123d's `export_gltf()` writes to a file path, not a buffer. Use Pyodide's virtual filesystem:

```python
from build123d import export_gltf
export_gltf(assembly, '/tmp/output.glb', binary=True,
            linear_deflection=0.0005, angular_deflection=0.05)
with open('/tmp/output.glb', 'rb') as f:
    gltf_bytes = f.read()
```

Transfer the bytes as ArrayBuffer to main thread (transferable for zero-copy).

---

## Development Workflow

### Always Use Feature Branches and PRs

- Do all work as PRs. Never commit directly to main.
- Create a feature branch for each change
- Push changes and create a PR for review
- **Do not automatically merge PRs. Do not merge unless given explicit direction.**
- Creating a PR and merging are two separate steps requiring separate user consent

### Pre-Push Checklist (MANDATORY)

```
[ ] pnpm typecheck passes (no TypeScript errors)
[ ] pnpm test passes (all tests green)
[ ] pnpm build succeeds
[ ] No `any` types introduced
[ ] Engine abstraction not violated (no Worker/postMessage in UI code)
[ ] Provider abstraction not violated (no provider names in chat UI)
[ ] Changes are batched (not micro-commits requiring repeated user testing)
```

### No Unasked-For Changes

- Make ONLY the changes explicitly requested
- If you think something additional would be beneficial, ASK first
- When fixing issues, fix only what was reported
- Don't "improve" nearby code, add docstrings to untouched code, or refactor surroundings

### Commit Practices

- Write clear commit messages explaining "why" not just "what"
- Atomic commits — one logical change per commit
- Run tests before committing
- Format: `<type>: <subject>` (feat, fix, docs, refactor, test, chore)

---

## Commands Reference

```bash
# Development
pnpm dev              # Start Vite dev server (frontend)
pnpm build            # Build all packages
pnpm test             # Run all tests (Vitest)
pnpm typecheck        # TypeScript type checking
pnpm lint             # ESLint

# Individual packages
pnpm --filter @maquetto/frontend dev
pnpm --filter @maquetto/frontend test
pnpm --filter @maquetto/api-proxy dev
```

## Key Principles (from spec)

1. **Typed everywhere** — No `any`. api-types is the single source of truth.
2. **Engine abstraction** — UI imports CadEngine interface, never the implementation.
3. **Provider abstraction** — Vercel AI SDK handles provider differences.
4. **Progressive UX** — App usable (editor + chat) in <1s. Engine is a background concern.
5. **Python is real** — Users can import numpy, write classes, use generators. Never restrict.
6. **Errors are data** — Structured typed objects, never thrown across boundaries.
7. **Cache aggressively** — Service worker caches all WASM. Second visit <5s to ready.
8. **Test the boundaries** — Test API contracts, hooks, component behavior. Not Three.js internals or Pyodide's Python execution.

## Features (Complete)

- Web Worker with Pyodide + OCP.wasm, progressive loading
- CadEngine interface + Web Worker implementation
- Service worker for WASM caching
- Monaco editor with Python highlighting, Build123d completions, error markers
- Three.js viewport with PBR rendering, part labels, part selection, view cube
- AI chat with streaming, tool-loop agent (test_code), thinking indicators
- Google Gemini (OAuth + BYOK) + Anthropic Claude (BYOK), model selection
- Viewport screenshot for AI vision context
- First-run screen with BYOK-first flow (Gemini/Claude tabs)
- Supabase auth (Google OAuth), cloud save/load with RLS
- Python sandbox (blocked js/pyodide imports, network APIs)
- Stop button for long-running compilations
- Rename projects (editable title in toolbar, reflected in editor tab)
- Import/export Python code to/from local files
- Export to STL and STEP (filenames include project name + timestamp)
- Credential validation on startup and provider change
- Vercel Analytics
- Version history with diff view
- Tests for engine contract, hooks, components

## Current Phase

### Do NOT Build (Yet)
- Multiple files or editor tabs
- Undo/redo
- Face/edge selection (part-level only for now)
- Collaboration or sharing
- OpenAI provider (blocked on CORS — no browser support)
