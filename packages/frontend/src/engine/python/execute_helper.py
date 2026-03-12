import ast
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

def _find_intermediate_vars(code_str):
    """Identify variables consumed by later CAD operations (boolean ops, extrusions).

    A variable is intermediate if its last use as an operand in + / - or as the
    first argument to extrude/revolve/sweep/loft occurs AFTER its last assignment.
    Variables that are consumed and reassigned on the same line (e.g. turner = turner - slot)
    are kept because the final value is the result, not the consumed input.
    """
    try:
        tree = ast.parse(code_str)
    except SyntaxError:
        return set()

    last_assigned = {}
    last_consumed = {}

    for node in ast.walk(tree):
        line = getattr(node, 'lineno', 0)

        # Track assignments
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    last_assigned[target.id] = max(last_assigned.get(target.id, 0), line)
        elif isinstance(node, ast.AugAssign) and isinstance(node.target, ast.Name):
            last_assigned[node.target.id] = max(last_assigned.get(node.target.id, 0), line)

        # Boolean ops: a + b, a - b (union, cut)
        if isinstance(node, ast.BinOp) and isinstance(node.op, (ast.Add, ast.Sub)):
            for operand in (node.left, node.right):
                if isinstance(operand, ast.Name):
                    last_consumed[operand.id] = max(last_consumed.get(operand.id, 0), line)

        # Augmented boolean: a += b, a -= b
        if isinstance(node, ast.AugAssign) and isinstance(node.op, (ast.Add, ast.Sub)):
            if isinstance(node.value, ast.Name):
                last_consumed[node.value.id] = max(last_consumed.get(node.value.id, 0), line)

        # Shape-consuming functions: extrude(sketch, ...), revolve(sketch, ...), etc.
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
            if node.func.id in ('extrude', 'revolve', 'sweep', 'loft'):
                if node.args and isinstance(node.args[0], ast.Name):
                    last_consumed[node.args[0].id] = max(
                        last_consumed.get(node.args[0].id, 0), line)

    intermediates = set()
    for var_name, consume_line in last_consumed.items():
        assign_line = last_assigned.get(var_name, 0)
        if consume_line > assign_line:
            intermediates.add(var_name)

    return intermediates


def _execute_and_export(code_str, quality_level):
    """Execute user code, find shapes, export glTF + metadata as JSON string."""
    from build123d import (
        Shape, Compound, Part, Sketch, BuildPart, BuildSketch, BuildLine,
        export_gltf, Axis, Color
    )
    import numpy

    start_time = time.time()

    # Set up sandboxed namespace with build123d + numpy
    # __SANDBOX_SETUP__

    # Capture user code stdout (print() output)
    import io as _io
    _capture_buf = _io.StringIO()
    _orig_stdout = sys.stdout

    # Execute user code
    try:
        sys.stdout = _capture_buf
        exec(code_str, namespace)
        sys.stdout = _orig_stdout
    except SyntaxError as e:
        sys.stdout = _orig_stdout
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
            'consoleOutput': _capture_buf.getvalue(),
        })
    except Exception as e:
        sys.stdout = _orig_stdout
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
        print(f'[Worker] Runtime error at line {line_no}:\n{full_tb}')
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
            'consoleOutput': _capture_buf.getvalue(),
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

    # Filter out intermediate construction variables (consumed by boolean ops / extrusions)
    intermediate_vars = _find_intermediate_vars(code_str)
    if intermediate_vars:
        filtered = [(n, o) for n, o in shapes if n not in intermediate_vars]
        hidden = [n for n, _ in shapes if n in intermediate_vars]
        if hidden:
            print(f'[export] Hidden intermediate shapes: {", ".join(hidden)}')
        if filtered:
            shapes = filtered

    # When 3D solids exist, filter out 2D/construction geometry (Sketch, Face, Edge, Wire).
    # These are almost always intermediate construction artifacts, not final output.
    from build123d import Face, Edge, Wire, Solid
    solids = [(n, o) for n, o in shapes
              if isinstance(o, (Part, Solid, Compound)) and not isinstance(o, (Face, Edge, Wire, Sketch))]
    if solids:
        non_solids = [n for n, o in shapes if (n, o) not in solids]
        if non_solids:
            print(f'[export] Hidden construction geometry: {", ".join(non_solids)}')
        shapes = solids

    if not shapes:
        elapsed = (time.time() - start_time) * 1000
        return json.dumps({
            'gltfBase64': '',
            'parts': [],
            'errors': [],
            'warnings': ['No shapes found in the code output.'],
            'executionTimeMs': round(elapsed),
            'consoleOutput': _capture_buf.getvalue(),
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
            'consoleOutput': _capture_buf.getvalue(),
        })

    elapsed = (time.time() - start_time) * 1000
    return json.dumps({
        'gltfBase64': gltf_base64,
        'parts': parts_meta,
        'errors': [],
        'warnings': [],
        'executionTimeMs': round(elapsed),
        'consoleOutput': _capture_buf.getvalue(),
    })
