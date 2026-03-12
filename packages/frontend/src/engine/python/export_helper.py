def _export_to_format(code_str, fmt):
    """Execute user code, find shapes, export to STL or STEP."""
    from build123d import (
        Shape, Compound, Part, Sketch, BuildPart, BuildSketch, BuildLine,
        export_stl, export_step, Axis, Color
    )
    import json
    import base64

    # Set up sandboxed namespace with build123d + numpy
    # __SANDBOX_SETUP__

    try:
        exec(code_str, namespace)
    except Exception as e:
        return json.dumps({'error': f'Code execution failed: {e}'})

    # Find shapes (same logic as _execute_and_export)
    shapes = []
    for name, obj in namespace.items():
        if name in pre_exec_names or name.startswith('_'):
            continue
        if isinstance(obj, (Shape, Compound, Part, Sketch)):
            shapes.append((name, obj))
        elif hasattr(obj, 'part') and isinstance(getattr(obj, 'part', None), (Shape, Part)):
            mode = getattr(obj, 'mode', None)
            if mode is not None and hasattr(mode, 'name') and mode.name != 'ADD':
                continue
            shapes.append((name, obj.part))
        elif hasattr(obj, 'sketch') and isinstance(getattr(obj, 'sketch', None), (Shape, Sketch)):
            shapes.append((name, obj.sketch))

    if not shapes:
        return json.dumps({'error': 'No shapes found to export'})

    # When 3D solids exist, filter out 2D/construction geometry
    from build123d import Face, Edge, Wire, Solid
    solids = [(n, o) for n, o in shapes
              if isinstance(o, (Part, Solid, Compound)) and not isinstance(o, (Face, Edge, Wire, Sketch))]
    if solids:
        non_solids = [n for n, o in shapes if (n, o) not in solids]
        if non_solids:
            print(f'[export] Hidden construction geometry: {", ".join(non_solids)}')
        shapes = solids

    if not shapes:
        return json.dumps({'error': 'No shapes found to export after filtering'})

    shape_objects = [s[1] for s in shapes]
    if len(shape_objects) == 1:
        assembly = shape_objects[0]
    else:
        assembly = Compound(children=shape_objects)

    ext = 'stl' if fmt == 'stl' else 'step'
    out_path = f'/tmp/export.{ext}'

    try:
        if fmt == 'stl':
            export_stl(assembly, out_path,
                       linear_deflection=0.01, angular_deflection=0.2)
        else:
            export_step(assembly, out_path)

        with open(out_path, 'rb') as f:
            data = f.read()
        print(f'[export] {fmt.upper()} file size: {len(data)} bytes')
        return json.dumps({
            'dataBase64': base64.b64encode(data).decode('ascii'),
            'filename': f'model.{ext}',
        })
    except Exception as e:
        return json.dumps({'error': f'{fmt.upper()} export failed: {e}'})
