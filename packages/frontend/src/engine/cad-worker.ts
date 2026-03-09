/**
 * Web Worker entry point for the CAD engine.
 *
 * Loads Pyodide + OCP.wasm + Build123d and executes user code.
 * Loading sequence proven in pzfreo/wormgear — order matters.
 *
 * This file is the ONLY place that references Pyodide or Web Worker APIs.
 * The UI layer never imports this directly.
 */

import type { WorkerRequest, WorkerResponse, EnginePhase } from '@maquetto/api-types';

// Python helpers loaded as raw strings via Vite ?raw imports.
// The __SANDBOX_SETUP__ placeholder is replaced at runtime with the
// shared sandbox code that blocks js/pyodide modules and prepares
// a build123d + numpy namespace.
import SANDBOX_SETUP_RAW from './python/sandbox_setup.py?raw';
import EXECUTE_HELPER_RAW from './python/execute_helper.py?raw';
import EXPORT_HELPER_RAW from './python/export_helper.py?raw';

const EXECUTE_HELPER = EXECUTE_HELPER_RAW.replace('    # __SANDBOX_SETUP__', SANDBOX_SETUP_RAW);
const EXPORT_HELPER = EXPORT_HELPER_RAW.replace('    # __SANDBOX_SETUP__', SANDBOX_SETUP_RAW);

// Pyodide ESM import — use .mjs for ES module workers
// @ts-expect-error — Pyodide loaded from CDN, no type declarations
import { loadPyodide as _loadPyodide } from 'https://cdn.jsdelivr.net/pyodide/v0.29.0/full/pyodide.mjs';

const loadPyodide = _loadPyodide as (config: {
  indexURL: string;
  stdout?: (text: string) => void;
  stderr?: (text: string) => void;
}) => Promise<PyodideInterface>;

interface PyodideInterface {
  loadPackage(packages: string[]): Promise<void>;
  pyimport(name: string): PyProxy;
  runPythonAsync(code: string): Promise<unknown>;
  globals: PyProxy;
  FS: {
    mkdir(path: string): void;
    writeFile(path: string, data: string | Uint8Array): void;
    readFile(path: string, opts?: { encoding?: string }): Uint8Array;
  };
}

interface PyProxy {
  set_index_urls(urls: string[]): void;
  set(key: string, value: unknown): void;
  install(pkg: string | string[]): Promise<void>;
  add_mock_package(name: string, version: string, options?: Record<string, string>): void;
  get(key: string): unknown;
  toJs(): unknown;
  destroy(): void;
}

const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.29.0/full/';

let pyodide: PyodideInterface | null = null;

// --- Security: block network APIs during user code execution ---
// Save originals so Pyodide/micropip can still use them during init.
// We disable them only while user code runs, then restore after.
const _originalFetch = self.fetch;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _originalXHR = (self as any).XMLHttpRequest;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _originalWebSocket = (self as any).WebSocket;

function blockNetworkAPIs(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (self as any).fetch = undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (self as any).XMLHttpRequest = undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (self as any).WebSocket = undefined;
}

function restoreNetworkAPIs(): void {
  self.fetch = _originalFetch;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (self as any).XMLHttpRequest = _originalXHR;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (self as any).WebSocket = _originalWebSocket;
}

function postStatus(phase: EnginePhase, progress: number): void {
  const msg: WorkerResponse = {
    type: 'status',
    status: { phase, progress },
  };
  self.postMessage(msg);
}

function postError(phase: EnginePhase, code: string, message: string): void {
  const msg: WorkerResponse = {
    type: 'status',
    status: {
      phase,
      progress: 0,
      error: { code, message },
    },
  };
  self.postMessage(msg);
}

/**
 * Initialize Pyodide + OCP.wasm + Build123d.
 * Loading sequence from pzfreo/wormgear — order matters!
 */
async function initialize(): Promise<void> {
  try {
    // 1. Load Pyodide (imported as ESM at top of file)
    console.log('[Worker] Loading Pyodide from CDN...');
    postStatus('loading-pyodide', 10);

    pyodide = await loadPyodide({
      indexURL: PYODIDE_CDN,
      stdout: (text: string) => console.log('[py]', text),
      stderr: (text: string) => console.warn('[py:err]', text),
    });
    console.log('[Worker] Pyodide loaded');
    postStatus('loading-pyodide', 25);

    // 2. Load micropip + pydantic (pydantic MUST come from Pyodide's bundled version)
    console.log('[Worker] Loading micropip + pydantic...');
    await pyodide.loadPackage(['micropip', 'pydantic']);
    postStatus('loading-ocp', 30);

    // 3. Set custom index for OCP.wasm (NOT on PyPI — pre-compiled WASM binaries)
    console.log('[Worker] Setting OCP.wasm custom index...');
    const micropip = pyodide.pyimport('micropip');
    micropip.set_index_urls([
      'https://yeicor.github.io/OCP.wasm',
      'https://pypi.org/simple',
    ]);
    postStatus('loading-ocp', 35);

    // 4. Install lib3mf
    console.log('[Worker] Installing lib3mf...');
    await micropip.install('lib3mf');
    postStatus('loading-ocp', 40);

    // 5. Install ssl (needed in WASM)
    console.log('[Worker] Installing ssl...');
    await micropip.install('ssl');
    postStatus('loading-ocp', 45);

    // 6. Install ocp_vscode from Jojain's fork (no PyPerclip — fails in WASM)
    console.log('[Worker] Installing ocp_vscode (Jojain fork)...');
    await micropip.install(
      'https://raw.githubusercontent.com/Jojain/vscode-ocp-cad-viewer/no_pyperclip/ocp_vscode-2.9.0-py3-none-any.whl',
    );
    postStatus('loading-ocp', 55);

    // 7. Mock py-lib3mf (build123d expects it as separate module)
    console.log('[Worker] Mocking py-lib3mf...');
    await pyodide.runPythonAsync(`
import micropip
micropip.add_mock_package("py-lib3mf", "2.4.1",
    modules={"py_lib3mf": "from lib3mf import *"})
`);
    postStatus('loading-build123d', 60);

    // 8. Install build123d + sqlite3
    console.log('[Worker] Installing build123d + sqlite3...');
    await micropip.install(['build123d==0.10.0', 'sqlite3']);
    postStatus('loading-build123d', 85);

    // 9. Pre-import build123d and numpy into global namespace
    console.log('[Worker] Pre-importing build123d + numpy...');
    await pyodide.runPythonAsync(`
from build123d import *
import numpy
`);
    postStatus('initializing', 95);

    // 10. Load the execute helper script
    console.log('[Worker] Loading execute helper...');
    await pyodide.runPythonAsync(EXECUTE_HELPER);
    await pyodide.runPythonAsync(EXPORT_HELPER);
    console.log('[Worker] Engine ready');
    postStatus('ready', 100);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Worker] Initialization failed:', message);
    postError('error', 'INIT_FAILED', message);
  }
}

/**
 * Execute user code, scan for shapes, export glTF + metadata.
 */
async function handleCompile(
  requestId: string,
  code: string,
  quality: string,
): Promise<void> {
  if (!pyodide) {
    console.warn('[Worker] Compile requested but engine not initialized');
    const msg: WorkerResponse = {
      type: 'compile-error',
      requestId,
      error: { code: 'NOT_READY', message: 'Engine not initialized' },
    };
    self.postMessage(msg);
    return;
  }

  try {
    console.log(`[Worker] Compiling (quality=${quality}, ${code.length} chars)...`);
    // Pass code and quality to the Python execute helper
    pyodide.globals.set('_user_code', code);
    pyodide.globals.set('_quality_level', quality);

    // Block network APIs while user code runs (defense-in-depth)
    blockNetworkAPIs();
    let resultJson: string;
    try {
      resultJson = (await pyodide.runPythonAsync(
        '_execute_and_export(_user_code, _quality_level)',
      )) as string;
    } finally {
      restoreNetworkAPIs();
    }

    const result = JSON.parse(resultJson);
    console.log(`[Worker] Compilation complete: ${result.errors.length} errors, ${result.warnings.length} warnings, ${result.parts.length} parts, glTF=${result.gltfBase64.length} chars, ${result.executionTimeMs}ms`);

    const msg: WorkerResponse = {
      type: 'compile-result',
      requestId,
      result,
    };
    self.postMessage(msg);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Worker] Compilation failed:', message);
    const msg: WorkerResponse = {
      type: 'compile-error',
      requestId,
      error: { code: 'EXEC_FAILED', message },
    };
    self.postMessage(msg);
  }
}

/**
 * Export the model to STL or STEP format.
 * Runs user code, finds shapes, then exports to the requested format.
 */
async function handleExport(
  requestId: string,
  code: string,
  format: string,
): Promise<void> {
  if (!pyodide) {
    const msg: WorkerResponse = {
      type: 'export-error',
      requestId,
      error: { code: 'NOT_READY', message: 'Engine not initialized' },
    };
    self.postMessage(msg);
    return;
  }

  try {
    console.log(`[Worker] Exporting (format=${format}, ${code.length} chars)...`);
    pyodide.globals.set('_user_code', code);
    pyodide.globals.set('_export_format', format);

    blockNetworkAPIs();
    let resultJson: string;
    try {
      resultJson = (await pyodide.runPythonAsync(
        '_export_to_format(_user_code, _export_format)',
      )) as string;
    } finally {
      restoreNetworkAPIs();
    }

    const result = JSON.parse(resultJson);
    if (result.error) {
      const msg: WorkerResponse = {
        type: 'export-error',
        requestId,
        error: { code: 'EXPORT_FAILED', message: result.error },
      };
      self.postMessage(msg);
      return;
    }

    // Convert base64 to ArrayBuffer for zero-copy transfer
    const binary = atob(result.dataBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const buffer = bytes.buffer;

    const msg: WorkerResponse = {
      type: 'export-result',
      requestId,
      data: buffer,
      filename: result.filename,
    };
    self.postMessage(msg, { transfer: [buffer] });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Worker] Export failed:', message);
    const msg: WorkerResponse = {
      type: 'export-error',
      requestId,
      error: { code: 'EXPORT_FAILED', message },
    };
    self.postMessage(msg);
  }
}

// Message handler
self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;
  console.log(`[Worker] Received message: ${msg.type}`);

  switch (msg.type) {
    case 'init':
      void initialize();
      break;

    case 'compile':
      void handleCompile(msg.requestId, msg.code, msg.quality);
      break;

    case 'export':
      void handleExport(msg.requestId, msg.code, msg.format);
      break;
  }
};
