    import builtins as _builtins_mod
    _original_import = _builtins_mod.__import__
    _BLOCKED_MODULES = frozenset({
        'js', 'pyodide', 'pyodide_js', 'pyodide_js._api',
        'pyodide.http', 'pyodide.ffi', 'pyodide.code',
    })
    def _safe_import(name, *args, **kwargs):
        if name in _BLOCKED_MODULES or name.startswith('pyodide.'):
            raise ImportError(f"Module '{name}' is not available in the CAD sandbox")
        return _original_import(name, *args, **kwargs)

    namespace = {'__builtins__': __builtins__}
    exec('from build123d import *', namespace)
    exec('import numpy', namespace)
    namespace['__builtins__'] = dict(vars(_builtins_mod))
    namespace['__builtins__']['__import__'] = _safe_import

    pre_exec_names = set(namespace.keys())
