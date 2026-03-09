# Maquetto — AI-Powered Build123d CAD IDE

## Vision

Maquetto is a browser-only AI-powered CAD IDE. Users write Build123d
Python code, see real-time 3D previews, and use AI to modify designs
through natural language with full spatial context from the viewport.

The name comes from the sculptor's term for a preliminary model — a
small-scale prototype used to explore form before committing to the
final piece. That is exactly what this tool enables: rapid, AI-assisted
exploration of 3D form.

Everything runs in the browser. Python executes via Pyodide + OCP.wasm
in a Web Worker. User authentication and cloud storage are provided by
Supabase. The only other server component is an optional thin proxy for
AI providers that require one.


## Architecture

Three layers with strict boundaries:

### 1. UI Layer (React + TypeScript)

Code editor, 3D viewport, AI chat panel, and toolbar. This layer knows
nothing about Python, Pyodide, Web Workers, or AI provider specifics.
It depends only on two interfaces: a CadEngine interface for geometry
and an AI provider interface (via Vercel AI SDK) for chat.

### 2. CAD Engine (Web Worker)

Pyodide + OCP.wasm + Build123d running in a dedicated thread. Accepts
code strings, returns glTF meshes and part metadata as JSON. Reports
loading progress during initialization. Fully sandboxed by WASM — no
filesystem, no network access. Users can import numpy, write helper
functions, use list comprehensions — full Python. This is the entire
value proposition over OpenSCAD.

### 3. AI Layer (Vercel AI SDK + Multiple Providers)

All AI communication goes through the Vercel AI SDK, which provides a
unified interface across providers. The chat UI, context assembly, and
response parsing are completely provider-agnostic. Users select their
preferred provider in settings.

### Design Constraints

The UI layer depends on a CadEngine INTERFACE, not on the Web Worker
implementation. A second implementation backed by an HTTP API to a
Python server must be a drop-in replacement with zero UI changes. All
communication uses typed message contracts — the transport is an
implementation detail.

The AI layer depends on the Vercel AI SDK's provider interface, not on
any specific AI service. Adding a new provider means installing one
npm package and adding it to a registry. No other code changes.


## AI Integration

Use the Vercel AI SDK (@ai-sdk/react for hooks, plus provider packages)
as the abstraction layer for all AI communication.

The useChat hook from @ai-sdk/react manages conversation state,
streaming, and message history. Provider selection is a user setting
persisted in localStorage.

### Default Provider: Google Gemini (via Supabase OAuth)

Lowest friction onboarding. Users click "Sign in with Google" and
are immediately productive — a single OAuth flow provides both app
authentication and Gemini API access.

- Package: @ai-sdk/google
- Auth: Supabase Google OAuth with additional Gemini scope
- The Gemini scope is requested at sign-in time via `signInWithOAuth`
  options (not in the Supabase dashboard — there is no "additional
  scopes" setting there):
  ```typescript
  supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: 'https://www.googleapis.com/auth/generative-language',
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  });
  ```
- On sign-in, Supabase stores the Google `provider_token` on the session
- This provider token is passed to the Vercel AI SDK's Google provider
  for Gemini API calls
- Usage bills to the user's own Google Cloud account
- Free tier available (rate-limited, not all regions)
- No proxy needed — calls go directly to Google
- Token refresh: Supabase handles Google token refresh automatically
  via `provider_refresh_token`; the app re-reads `session.provider_token`
  before each AI request

### Power User Provider: Anthropic Claude (BYOK)

Better code generation quality for Build123d, but requires manual
API key setup. Available to any user (no sign-in required).

- Package: @ai-sdk/anthropic
- Auth: user pastes API key from platform.claude.com
- Key stored locally in browser (localStorage), never sent to our servers
- No proxy needed — Anthropic supports direct browser access via the
  `anthropic-dangerous-direct-browser-access` header (safe for BYOK
  since the user controls their own key)

### Google Gemini BYOK

Users can also use Gemini with their own API key (no Google sign-in
required). Get a key from aistudio.google.com. Google's Generative
AI API supports CORS, so no proxy is needed.

### Future Providers

Adding a provider requires only installing its @ai-sdk package and
registering it in the provider registry. No changes to the chat UI,
context assembly, or response parsing. Likely candidates: OpenAI
(GPT — blocked on CORS, would need a proxy), local models via
Ollama, Mistral.

### Context Assembly

A custom useCADChat hook wraps the Vercel AI SDK's useChat to inject
CAD-specific context before each request:

- System prompt establishing the AI as a Build123d assistant
- Current editor code
- Part metadata from the last compilation (IDs, colors, bounding
  boxes, volumes)
- Currently selected parts in the viewport
- Viewport screenshot as an image content block (for vision models)
- Camera angle description as text ("viewing from front-right, above")

The system prompt instructs the AI to reference parts by their
@-labels, understand spatial relationships from the metadata, and
always output complete Build123d scripts in Python code blocks.

### Tool-Loop Agent

The AI uses a tool-loop architecture via Vercel AI SDK's ToolLoopAgent.
The primary tool is `test_code`, which compiles the AI's generated code
in Pyodide before presenting it. If compilation fails, the AI is forced
to fix and retry (up to 6 steps). On success, the code is automatically
applied to the editor — the AI doesn't need to repeat it in text.

For conversational messages (e.g. "thanks", "looks good"), the AI
responds without invoking tools (toolChoice: 'auto').

### Response Handling

Part references (A, B, C) in chat text are rendered as colored badges
matching the viewport colors. The chat panel shows thinking indicators
("AI is thinking...", tool activity status) during streaming.


## CAD Engine Abstraction

Define a CadEngine interface with three capabilities:

- Status observation: subscribe to loading phase updates during
  initialization (loading-pyodide, loading-ocp, initializing, ready,
  error). Includes a progress percentage (best effort).
- Compilation: accept a code string and quality level (draft, normal,
  high), return a response containing glTF binary as base64, an array
  of part metadata, structured errors with line numbers and types
  (syntax, runtime, geometry), and warnings. Execution time in
  milliseconds.
- Disposal: clean up resources.

Part metadata includes: part ID ("A", "B", "C" — letter-based, assigned in
order of discovery), color (RGB from a 12-color palette), bounding box
(min/max corners), face count, and volume (null if not a solid).

The Web Worker implementation wraps postMessage with request IDs and
promise resolution. A future HTTP implementation would use fetch with
identical request/response shapes. The UI layer imports only the
interface, never the implementation.


## Web Worker

### Initialization Sequence

1. Load Pyodide core from CDN (~6.4MB, cached by service worker)
2. Install micropip
3. Use micropip to install OCP.wasm wheels
4. Use micropip to install build123d
5. Run initialization: import build123d and numpy into a base namespace
6. Report ready status to main thread

Post status updates at each phase so the UI can show progress.

### Code Execution

Execute user code via exec() in a prepared namespace with Build123d
and numpy pre-imported. After execution, scan the namespace for Shape,
Compound, Part, and Sketch objects. Skip private variables and imported
modules.

Each discovered shape becomes a part with an assigned ID, color,
bounding box, and volume. All parts are tessellated and exported as a
single glTF binary with each part as a named mesh node, so the Three.js
frontend can match mesh names to part metadata.

Quality levels control tessellation tolerance: draft is coarse (fast),
high is fine (slow). Normal is the default.

Errors are caught and returned as structured data — never thrown across
the worker boundary.

### Security

Pyodide's WASM sandbox naturally prevents filesystem access, network
access, and process spawning. No additional sandboxing is needed. This
is a major advantage of the browser-based approach.


## Progressive Loading UX

The app must be useful within one second of navigation. The CAD engine
takes 10-15 seconds on first visit, 3-5 seconds on cached visits.

Design around this, never fight it:

- The app shell, editor, and chat panel render immediately
- Users can write code and talk to the AI while the engine loads
- A status badge in the toolbar shows the current loading phase and
  progress percentage
- The Run button is disabled with a tooltip until the engine is ready
- If the user wrote code during loading, auto-compile when ready
- Never show a blocking modal or loading screen — the editor and chat
  are independently useful without the geometry engine

A service worker caches all WASM and wheel files using a cache-first
strategy. Pyodide core should be preloaded via link rel="preload" tags
in the HTML head.


## 3D Viewport

Use Three.js via react-three-fiber and drei for proper CAD-quality
rendering. Out-of-the-box Three.js looks flat — configure it properly:

- PBR materials (MeshStandardMaterial) with metalness ~0.1, roughness
  ~0.6 for a default matte plastic/printed part look
- Environment map via drei's Environment component or PMREMGenerator
  with RoomEnvironment — no external HDRI file needed
- ACES filmic tone mapping for natural color response
- Three-point lighting: ambient (low), directional (with shadows),
  and hemisphere (sky/ground fill)
- Grid helper on the ground plane for scale reference
- Background gradient via CSS behind a transparent Three.js canvas
- OrbitControls for rotate, pan, zoom
- View cube (GizmoViewcube from drei) in bottom-left corner for
  standard CAD views (Front, Back, Left, Right, Top, Bottom)

### Mesh Loading

Receive glTF base64 from the engine, decode and load with GLTFLoader.
Iterate mesh nodes, match by name ("A", "B") to part metadata.
Apply per-part colors from metadata as material baseColorFactor.

### Part Labels

Render part labels ("A", "B") as CSS2D overlays positioned at
bounding box centroids. Color-coded to match part colors. Toggleable.

### Part Selection

Raycasting on click to select parts. Selected parts highlighted with
an outline effect. Selected part IDs stored in state and included in
AI context for spatial reference.

### Viewport Screenshot

Capture the canvas via toDataURL() before each AI message. This image
is sent as a vision input so the AI can "see" the current model from
the user's perspective.


## Code Editor

Monaco Editor configured for Python. Syntax highlighting, bracket
matching, and auto-indentation out of the box.

Register Build123d completions for common classes and functions (Box,
Cylinder, Sphere, Fillet, Chamfer, BuildPart, BuildSketch, Extrude,
Loft, etc.).

Map CompileError[] from the engine to Monaco editor markers — red
squiggles on the correct lines with error messages on hover.

Compilation trigger: manual Run button (keyboard shortcut Ctrl+Enter
or Cmd+Enter). Consider optional auto-compile with debounce as a
user setting, but default to manual for the prototype.


## Authentication and Cloud Storage

### Supabase Auth (Google)

User authentication is handled by Supabase with Google OAuth:

- **Google**: Provides app auth and cloud save. When combined with
  the Gemini OAuth scope, also provides free Gemini API access via
  the provider token. Sign-in is optional — users can use BYOK
  without an account.

Authentication state is managed in a Zustand auth slice that wraps
the Supabase client. The slice exposes: `user`, `session`,
`isAuthenticated`, `signInWithGoogle()`, `signInWithGitHub()`,
`signOut()`, and `getProviderToken()` (for Gemini access).

### Auth Flow

1. Supabase client initialized with project URL and anon key (public,
   safe for frontend — set via `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` environment variables)
2. `onAuthStateChange` listener updates the auth slice on sign-in,
   sign-out, and token refresh
3. On Google sign-in, the Gemini provider is auto-configured using
   `session.provider_token` — no manual API key entry needed
4. API keys are stored locally in browser localStorage, never sent
   to our servers

### Cloud Save/Load

Supabase Postgres stores user projects:

```sql
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  name text not null,
  code text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row Level Security: users can only access their own projects
alter table projects enable row level security;
create policy "Users can CRUD own projects"
  on projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

UI changes for cloud save:
- Save/Load buttons in the toolbar (visible when authenticated)
- Project name displayed in the header (editable)
- Auto-save on compile (debounced, updates `updated_at`)
- "My Projects" dropdown listing saved projects sorted by updated_at
- Unauthenticated users continue to use localStorage only

### Unauthenticated Usage

The app is fully usable without signing in:
- Editor, viewport, and AI chat work with BYOK API keys
- Code is stored in localStorage only (no cloud persistence)
- Users can sign in later from the toolbar for cloud save


## First-Run Experience

On first visit, before the user sees the full IDE:

1. Brief splash/welcome explaining what Maquetto is
2. Three paths, prioritising getting productive with AI immediately:
   - **Primary: BYOK card** — tabbed picker for Gemini or Claude,
     paste an API key and go. No sign-in required. Links to
     aistudio.google.com (Gemini) or platform.claude.com (Claude).
   - **Secondary: Google + Gemini OAuth** — one-click sign-in for
     free Gemini AI and cloud save. No API key needed. (Pending
     Google OAuth verification — users may see an "unverified app"
     warning.)
   - **Skip** — editor-only mode, no AI
3. Users can sign in with Google later from the toolbar for cloud save
   (progressive discovery — don't force sign-in upfront)
4. Show the IDE with a starter Build123d script and auto-compile when
   the engine is ready (engine loads in background during first-run)

Provider settings and account management are accessible from a settings
icon in the toolbar.


## Project Structure

Monorepo with pnpm workspaces:

- **packages/api-types**: Shared TypeScript type definitions for the
  engine API contract and the worker message protocol. This package
  is the source of truth for all typed communication.

- **packages/frontend**: React application containing the UI layer,
  the Web Worker entry point and its Python modules, and the service
  worker for WASM caching. Organized by feature domain: Editor,
  Viewport, Chat, Loading, Layout. Each domain has its component, its
  custom hook for logic, and its tests. Shared state in a Zustand store.

- **packages/api-proxy**: Reserved for future use. Both Google and
  Anthropic support direct browser access, so no proxy is currently
  needed. Would be required for OpenAI or other providers without
  CORS support.


## State Management

Zustand store organized by domain:

- Auth state: Supabase user, session, provider token, sign-in/out
  actions, isAuthenticated flag
- Engine state: current loading phase, progress, ready flag
- Editor state: current code, dirty flag
- Compilation state: status (idle/compiling/success/error), parts
  array, errors array, current glTF mesh, execution time
- Viewport state: selected part IDs, camera position description
- Chat state: message history, streaming flag, active provider
- Settings state: selected AI provider, API keys, quality preference
- Projects state: current project (id, name), save/load actions,
  project list for the "My Projects" dropdown


## Testing Strategy

Test at the boundaries, not the internals:

### Engine Contract Tests
A mock CadEngine that any implementation must satisfy. Tests the
interface shape: compile returns the correct structure, errors are
structured with line numbers and types, status callbacks fire during
loading transitions. These tests validate the contract, not the
implementation.

### Hook Tests
useCompilation, useCADChat, useEngineStatus tested with a mock engine
and mock AI provider. Verify they wire state correctly, inject context
into AI messages, handle streaming responses, and detect code blocks.

### Component Tests
Each component tested with React Testing Library. Editor renders and
triggers compile on keyboard shortcut. Chat renders messages, handles
streaming, and shows Apply button for code blocks. Loading screen
responds to engine status changes. Viewport tests limited to
mount/unmount — don't test Three.js rendering internals.

### Engine Integration Tests (CI only, slow)
Actually load Pyodide and run Build123d code. Verify a simple Box
produces valid glTF with correct metadata. Verify syntax errors return
structured errors with line numbers. Verify numpy imports work. Verify
timeout on infinite loops. Skip these in local development.

### API Proxy Tests
Verify request forwarding, SSE streaming passthrough, CORS headers,
rate limiting, and that API keys are never logged.


## Implemented Features

- Web Worker with Pyodide + OCP.wasm, progressive loading with status
- CadEngine interface and Web Worker implementation
- Service worker for WASM and wheel caching
- Monaco editor with Python highlighting, error markers, Build123d
  completions
- Three.js viewport with PBR rendering, part labels, part selection,
  view cube
- AI chat with tool-loop agent (test_code), streaming, thinking
  indicators
- Google Gemini (OAuth + BYOK) and Anthropic Claude (BYOK)
- Viewport screenshot capture for AI vision context
- Supabase auth with Google OAuth, cloud save/load with RLS
- BYOK-first onboarding screen (Gemini/Claude tabs)
- Rename projects, import/export Python, export STL/STEP
- Credential validation on startup and provider change
- Version history with diff view
- Vercel Analytics
- Python sandbox (blocked js/pyodide imports, network APIs)
- Stop button for long-running compilations
- Tests for engine contract, hooks, and components

### Phase 2 (Complete)

- Rename projects (editable title in toolbar, reflected in editor tab)
- Cloud save/load of projects via Supabase Postgres with RLS
- Import/export Python code to/from local files
- Export to STL and STEP (filenames include project name + timestamp)
- View cube for standard CAD views
- Gemini BYOK support (in addition to OAuth)
- BYOK-first onboarding flow
- Credential validation on startup
- Version history with diff view
- Vercel Analytics

### Do Not Build (Yet)

- Multiple files or editor tabs
- Undo/redo
- Face or edge selection (part-level only for now)
- Collaboration or sharing features
- OpenAI provider (blocked on CORS)


## Tech Stack

- Node 22+, pnpm 9+
- React 19, TypeScript 5.5+
- Vite 6+
- Three.js via @react-three/fiber 9+ and @react-three/drei
- Monaco Editor via @monaco-editor/react
- Vercel AI SDK: @ai-sdk/react, @ai-sdk/google, @ai-sdk/anthropic
- Supabase: @supabase/supabase-js for auth and Postgres cloud storage
- Zustand 5+ for state management
- Vitest + React Testing Library for tests
- Pyodide (latest, loaded from CDN)
- OCP.wasm (from yeicor's releases)
- Vercel Edge Functions or Cloudflare Workers for Claude proxy
- Static hosting (Vercel, Netlify, or Cloudflare Pages) for the app


## Key Principles

1. **Typed everywhere.** No `any` in TypeScript. The api-types package
   is the single source of truth for all communication between layers.

2. **Engine abstraction.** UI code imports the CadEngine interface,
   never references Web Workers or postMessage directly. Swapping to
   a server backend must require zero UI changes.

3. **Provider abstraction.** The Vercel AI SDK handles provider
   differences. The chat UI, context assembly, and response parsing
   never reference Google, Anthropic, or any provider directly.

4. **Progressive UX.** The app is usable (editor + chat) within one
   second. The CAD engine is a background concern with a status badge.
   Never block the user.

5. **Python is real.** Users can import numpy, write classes, use
   generators, call math functions. This is the value proposition.
   Never restrict the Python environment.

6. **Errors are data.** Compilation errors and AI errors are returned
   as structured typed objects, never thrown across boundaries.

7. **Cache aggressively.** Service worker caches all WASM artifacts.
   Second visit must reach engine-ready in under 5 seconds.

8. **Test the boundaries.** Test the API contracts, the hooks, and the
   component behavior. Do not test Three.js rendering internals or
   Pyodide's Python execution in unit tests.
