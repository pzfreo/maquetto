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

    const resultJson = (await pyodide.runPythonAsync(
      '_execute_and_export(_user_code, _quality_level)',
    )) as string;

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
  }
};

/**
 * Python helper script for executing user code and exporting results.
 * Runs inside Pyodide. Scans for Shape objects, computes metadata,
 * tessellates and exports as glTF.
 */
const EXECUTE_HELPER = `
import json
import base64
import time
import traceback
import sys

# Color palette (RGB 0-1) matching TypeScript PART_COLORS
_PALETTE = [
    [0.259, 0.522, 0.957],
    [0.957, 0.318, 0.216],
    [0.204, 0.659, 0.325],
    [1.000, 0.702, 0.000],
    [0.612, 0.153, 0.690],
    [0.000, 0.737, 0.831],
    [0.957, 0.490, 0.000],
    [0.345, 0.298, 0.659],
    [0.827, 0.184, 0.455],
    [0.294, 0.686, 0.514],
    [0.475, 0.333, 0.282],
    [0.620, 0.620, 0.620],
]

_QUALITY_MAP = {
    'draft':  (0.1,   0.5),
    'normal': (0.01,  0.2),
    'high':   (0.001, 0.1),
}

# Generic variable names that don't make useful part labels
_GENERIC_NAMES = {'result', 'obj', 'shape', 'part', 'compound', 'assembly',
                  'output', 'model', 'thing', 'temp', 'tmp'}

def _index_to_letter_id(i):
    """Convert 0-based index to letter label: 0->A, 1->B, ... 25->Z, 26->AA."""
    result_str = ''
    n = i
    while True:
        result_str = chr(ord('A') + (n % 26)) + result_str
        n = n // 26 - 1
        if n < 0:
            break
    return result_str

def _var_name_to_display(name):
    """Convert Python variable name to Title Case display name.
    Returns None for generic or single-letter names."""
    if len(name) <= 1 or name.lower() in _GENERIC_NAMES:
        return None
    return ' '.join(word.capitalize() for word in name.split('_'))

def _execute_and_export(code_str, quality_level):
    """Execute user code, find shapes, export glTF + metadata as JSON string."""
    from build123d import (
        Shape, Compound, Part, Sketch, BuildPart, BuildSketch, BuildLine,
        export_gltf, Axis, Color
    )
    import numpy

    start_time = time.time()

    # Prepare namespace with build123d pre-imported
    namespace = {'__builtins__': __builtins__}
    exec('from build123d import *', namespace)
    exec('import numpy', namespace)

    # Snapshot namespace keys before user code so we only scan user-created variables
    pre_exec_names = set(namespace.keys())

    # Execute user code
    try:
        exec(code_str, namespace)
    except SyntaxError as e:
        elapsed = (time.time() - start_time) * 1000
        return json.dumps({
            'gltfBase64': '',
            'parts': [],
            'errors': [{
                'type': 'syntax',
                'message': str(e.msg),
                'line': e.lineno,
                'column': e.offset,
            }],
            'warnings': [],
            'executionTimeMs': round(elapsed),
        })
    except Exception as e:
        elapsed = (time.time() - start_time) * 1000
        # Try to extract line number from traceback
        line_no = None
        tb = traceback.extract_tb(e.__traceback__)
        for frame in reversed(tb):
            if frame.filename == '<string>':
                line_no = frame.lineno
                break
        # Include full traceback for debugging
        full_tb = traceback.format_exc()
        error_msg = f'{type(e).__name__}: {e}'
        print(f'[Worker] Runtime error at line {line_no}:\\n{full_tb}')
        return json.dumps({
            'gltfBase64': '',
            'parts': [],
            'errors': [{
                'type': 'runtime',
                'message': error_msg,
                'line': line_no,
                'column': None,
                'traceback': full_tb,
            }],
            'warnings': [],
            'executionTimeMs': round(elapsed),
        })

    # Scan only user-created variables for Shape-like objects
    shapes = []
    for name, obj in namespace.items():
        if name in pre_exec_names or name.startswith('_'):
            continue
        if isinstance(obj, (Shape, Compound, Part, Sketch)):
            print(f'[export] Found shape: {name} ({type(obj).__name__})')
            shapes.append((name, obj))
        # Also check for BuildPart context manager results
        # Skip BuildPart with non-ADD mode (e.g. SUBTRACT, INTERSECT) —
        # these are operations on a parent part, not standalone shapes.
        elif hasattr(obj, 'part') and isinstance(getattr(obj, 'part', None), (Shape, Part)):
            mode = getattr(obj, 'mode', None)
            if mode is not None and hasattr(mode, 'name') and mode.name != 'ADD':
                print(f'[export] Skipping {name} (mode={mode.name}, child of parent BuildPart)')
                continue
            print(f'[export] Found BuildPart result: {name}')
            shapes.append((name, obj.part))
        elif hasattr(obj, 'sketch') and isinstance(getattr(obj, 'sketch', None), (Shape, Sketch)):
            print(f'[export] Found BuildSketch result: {name}')
            shapes.append((name, obj.sketch))

    if not shapes:
        elapsed = (time.time() - start_time) * 1000
        return json.dumps({
            'gltfBase64': '',
            'parts': [],
            'errors': [],
            'warnings': ['No shapes found in the code output.'],
            'executionTimeMs': round(elapsed),
        })

    # Build part metadata
    parts_meta = []
    shape_objects = []
    for i, (name, shape) in enumerate(shapes):
        try:
            bb = shape.bounding_box()
            bb_min = [bb.min.X, bb.min.Y, bb.min.Z]
            bb_max = [bb.max.X, bb.max.Y, bb.max.Z]
        except Exception:
            bb_min = [0, 0, 0]
            bb_max = [0, 0, 0]

        try:
            face_count = len(shape.faces())
        except Exception:
            face_count = 0

        try:
            vol = float(shape.volume) if hasattr(shape, 'volume') else None
        except Exception:
            vol = None

        color = _PALETTE[i % len(_PALETTE)]
        part_id = _index_to_letter_id(i)
        display_name = _var_name_to_display(name)

        parts_meta.append({
            'id': part_id,
            'name': display_name,
            'color': color,
            'boundingBox': {'min': bb_min, 'max': bb_max},
            'faceCount': face_count,
            'volume': vol,
        })

        # Apply color to shape for glTF export
        try:
            shape.color = Color(*[c for c in color])
        except Exception:
            pass

        shape_objects.append(shape)

    # Export combined glTF
    linear_defl, angular_defl = _QUALITY_MAP.get(quality_level, _QUALITY_MAP['normal'])
    gltf_base64 = ''

    try:
        if len(shape_objects) == 1:
            assembly = shape_objects[0]
        else:
            assembly = Compound(children=shape_objects)

        print(f'[export] Exporting glTF (linear_defl={linear_defl}, angular_defl={angular_defl})...')
        export_gltf(
            assembly,
            '/tmp/output.glb',
            binary=True,
            linear_deflection=linear_defl,
            angular_deflection=angular_defl,
        )

        with open('/tmp/output.glb', 'rb') as f:
            gltf_bytes = f.read()
        print(f'[export] glTF file size: {len(gltf_bytes)} bytes')
        gltf_base64 = base64.b64encode(gltf_bytes).decode('ascii')
    except Exception as e:
        elapsed = (time.time() - start_time) * 1000
        return json.dumps({
            'gltfBase64': '',
            'parts': parts_meta,
            'errors': [{
                'type': 'geometry',
                'message': f'glTF export failed: {e}',
                'line': None,
                'column': None,
            }],
            'warnings': [],
            'executionTimeMs': round(elapsed),
        })

    elapsed = (time.time() - start_time) * 1000
    return json.dumps({
        'gltfBase64': gltf_base64,
        'parts': parts_meta,
        'errors': [],
        'warnings': [],
        'executionTimeMs': round(elapsed),
    })
`;
