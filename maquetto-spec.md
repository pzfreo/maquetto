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
in a Web Worker. There is no backend server. The only server component
is an optional thin proxy for AI providers that require one.


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

### Default Provider: Google Gemini (OAuth)

Lowest friction onboarding. Users click "Sign in with Google" and
are immediately productive.

- Package: @ai-sdk/google
- Auth: OAuth 2.0 via standard Google sign-in flow
- User grants the generativelanguage.googleapis.com scope
- Access token passed to the Vercel AI SDK's Google provider
- Usage bills to the user's own Google Cloud account
- Free tier available (rate-limited, not all regions)
- No proxy or server needed — calls go directly to Google

### Power User Provider: Anthropic Claude (BYOK)

Better code generation quality for Build123d, but requires manual
API key setup.

- Package: @ai-sdk/anthropic
- Auth: user pastes API key from console.anthropic.com
- Key stored in localStorage, never sent to any third party
- Requires a minimal stateless edge proxy for CORS forwarding
- The proxy must never log or store the key — it receives it in a
  request header and forwards to Anthropic's API
- Deploy proxy to Vercel Edge or Cloudflare Workers

### Future Providers

Adding a provider requires only installing its @ai-sdk package and
registering it in the provider registry. No changes to the chat UI,
context assembly, or response parsing. Likely candidates: OpenAI
(GPT), local models via Ollama, Mistral.

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

### Response Handling

When a Python code block appears in the AI response, show an "Apply to
Editor" button. Clicking it replaces the editor content and triggers
recompilation. Part references (@1, @2) in chat text are rendered as
colored badges matching the viewport colors.


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

Part metadata includes: part ID ("@1", "@2" — one-indexed, assigned in
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

### Mesh Loading

Receive glTF base64 from the engine, decode and load with GLTFLoader.
Iterate mesh nodes, match by name ("@1", "@2") to part metadata.
Apply per-part colors from metadata as material baseColorFactor.

### Part Labels

Render part labels ("@1", "@2") as CSS2D overlays positioned at
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


## First-Run Experience

On first visit, before the user sees the full IDE:

1. Brief splash/welcome explaining what Maquetto is
2. AI provider setup:
   - Primary option: "Sign in with Google" button (Gemini OAuth)
   - Secondary option: "Use Anthropic API key" with a text field
   - "Skip" option to use the editor without AI
3. Once authenticated, show the IDE with a starter Build123d script
   (e.g., a simple box with a fillet) and auto-compile it when the
   engine is ready

Provider settings are changeable later from a settings icon in the
toolbar.


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

- **packages/api-proxy**: Optional edge function for Claude API
  proxying. Only needed if the user selects Anthropic as their AI
  provider. Deployable to Vercel Edge or Cloudflare Workers.


## State Management

Zustand store organized by domain:

- Engine state: current loading phase, progress, ready flag
- Editor state: current code, dirty flag
- Compilation state: status (idle/compiling/success/error), parts
  array, errors array, current glTF mesh, execution time
- Viewport state: selected part IDs, camera position description
- Chat state: message history, streaming flag, active provider
- Settings state: selected AI provider, API keys, quality preference


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


## Prototype Scope

### Build

- Web Worker with Pyodide + OCP.wasm, progressive loading with status
- CadEngine interface and Web Worker implementation
- Service worker for WASM and wheel caching
- Monaco editor with Python highlighting, error markers, Build123d
  completions
- Three.js viewport with PBR rendering, part labels, part selection
- AI chat with Vercel AI SDK, streaming, code blocks, Apply to Editor
- Google Gemini provider with OAuth sign-in flow
- Anthropic Claude provider with BYOK and edge proxy
- Viewport screenshot capture for AI vision context
- First-run provider setup screen
- Tests for engine contract, hooks, and components

### Do Not Build

- File save/load or project management
- Export to STL, STEP, or 3MF
- User authentication beyond AI provider auth
- Multiple files or editor tabs
- Undo/redo
- Settings panel beyond provider selection
- Face or edge selection (part-level only for prototype)
- Collaboration or sharing features


## Tech Stack

- Node 22+, pnpm 9+
- React 19, TypeScript 5.5+
- Vite 6+
- Three.js via @react-three/fiber 9+ and @react-three/drei
- Monaco Editor via @monaco-editor/react
- Vercel AI SDK: @ai-sdk/react, @ai-sdk/google, @ai-sdk/anthropic
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
