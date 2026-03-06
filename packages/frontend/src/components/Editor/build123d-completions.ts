import type * as monacoTypes from 'monaco-editor';

type Monaco = typeof monacoTypes;

interface CompletionEntry {
  label: string;
  detail: string;
  insertText: string;
  documentation: string;
}

const BUILD123D_COMPLETIONS: CompletionEntry[] = [
  // Primitives
  {
    label: 'Box',
    detail: 'Box(length, width, height)',
    insertText: 'Box(${1:50}, ${2:40}, ${3:30})',
    documentation: 'Create a rectangular box.',
  },
  {
    label: 'Cylinder',
    detail: 'Cylinder(radius, height)',
    insertText: 'Cylinder(radius=${1:10}, height=${2:30})',
    documentation: 'Create a cylinder.',
  },
  {
    label: 'Sphere',
    detail: 'Sphere(radius)',
    insertText: 'Sphere(radius=${1:10})',
    documentation: 'Create a sphere.',
  },
  {
    label: 'Cone',
    detail: 'Cone(bottom_radius, top_radius, height)',
    insertText: 'Cone(bottom_radius=${1:10}, top_radius=${2:5}, height=${3:20})',
    documentation: 'Create a cone or truncated cone.',
  },
  {
    label: 'Torus',
    detail: 'Torus(major_radius, minor_radius)',
    insertText: 'Torus(major_radius=${1:20}, minor_radius=${2:5})',
    documentation: 'Create a torus.',
  },
  {
    label: 'Wedge',
    detail: 'Wedge(xsize, ysize, zsize, xmin, zmin, xmax, zmax)',
    insertText: 'Wedge(${1:20}, ${2:20}, ${3:20}, ${4:5}, ${5:5}, ${6:15}, ${7:15})',
    documentation: 'Create a wedge shape.',
  },

  // Contexts
  {
    label: 'BuildPart',
    detail: 'with BuildPart() as part:',
    insertText: 'with BuildPart() as ${1:part}:\n    ${2:Box(50, 40, 30)}',
    documentation: 'Context manager for building 3D parts.',
  },
  {
    label: 'BuildSketch',
    detail: 'with BuildSketch() as sketch:',
    insertText: 'with BuildSketch() as ${1:sketch}:\n    ${2:Circle(radius=10)}',
    documentation: 'Context manager for building 2D sketches.',
  },
  {
    label: 'BuildLine',
    detail: 'with BuildLine() as line:',
    insertText: 'with BuildLine() as ${1:line}:\n    ${2:Line((0, 0), (10, 0))}',
    documentation: 'Context manager for building lines/wires.',
  },

  // Operations
  {
    label: 'Fillet',
    detail: 'Fillet(*edges, radius)',
    insertText: 'Fillet(*${1:part}.edges(), radius=${2:3})',
    documentation: 'Fillet (round) edges.',
  },
  {
    label: 'Chamfer',
    detail: 'Chamfer(*edges, length)',
    insertText: 'Chamfer(*${1:part}.edges(), length=${2:2})',
    documentation: 'Chamfer (bevel) edges.',
  },
  {
    label: 'Extrude',
    detail: 'Extrude(amount)',
    insertText: 'Extrude(amount=${1:10})',
    documentation: 'Extrude a sketch into 3D.',
  },
  {
    label: 'Revolve',
    detail: 'Revolve(axis, revolution_arc)',
    insertText: 'Revolve(axis=Axis.${1:Z}, revolution_arc=${2:360})',
    documentation: 'Revolve a sketch around an axis.',
  },
  {
    label: 'Loft',
    detail: 'Loft(sections)',
    insertText: 'Loft()',
    documentation: 'Loft between multiple sketches.',
  },
  {
    label: 'Sweep',
    detail: 'Sweep(path)',
    insertText: 'Sweep(path=${1:path})',
    documentation: 'Sweep a cross-section along a path.',
  },

  // 2D Shapes
  {
    label: 'Circle',
    detail: 'Circle(radius)',
    insertText: 'Circle(radius=${1:10})',
    documentation: 'Create a circle.',
  },
  {
    label: 'Rectangle',
    detail: 'Rectangle(width, height)',
    insertText: 'Rectangle(${1:20}, ${2:10})',
    documentation: 'Create a rectangle.',
  },
  {
    label: 'Polygon',
    detail: 'Polygon(*pts)',
    insertText: 'Polygon(${1:(0, 0), (10, 0), (5, 10)})',
    documentation: 'Create a polygon from points.',
  },
  {
    label: 'Line',
    detail: 'Line(start, end)',
    insertText: 'Line((${1:0}, ${2:0}), (${3:10}, ${4:0}))',
    documentation: 'Create a line between two points.',
  },

  // Modifiers
  {
    label: 'Offset',
    detail: 'Offset(amount)',
    insertText: 'Offset(amount=${1:2})',
    documentation: 'Offset a shape by a distance.',
  },
  {
    label: 'Mirror',
    detail: 'Mirror(about)',
    insertText: 'Mirror(about=Plane.${1:XZ})',
    documentation: 'Mirror a shape about a plane.',
  },
  {
    label: 'PolarLocations',
    detail: 'PolarLocations(radius, count)',
    insertText: 'PolarLocations(radius=${1:20}, count=${2:6})',
    documentation: 'Create polar array locations.',
  },
  {
    label: 'GridLocations',
    detail: 'GridLocations(x_spacing, y_spacing, x_count, y_count)',
    insertText: 'GridLocations(${1:10}, ${2:10}, ${3:3}, ${4:3})',
    documentation: 'Create grid array locations.',
  },

  // Positioning
  {
    label: 'Location',
    detail: 'Location(position, rotation)',
    insertText: 'Location((${1:0}, ${2:0}, ${3:0}))',
    documentation: 'Define a location for positioning.',
  },
  {
    label: 'Axis',
    detail: 'Axis.X / Y / Z',
    insertText: 'Axis.${1|X,Y,Z|}',
    documentation: 'Standard axis.',
  },
  {
    label: 'Plane',
    detail: 'Plane.XY / XZ / YZ',
    insertText: 'Plane.${1|XY,XZ,YZ|}',
    documentation: 'Standard plane.',
  },

  // Import
  {
    label: 'import build123d',
    detail: 'from build123d import *',
    insertText: 'from build123d import *',
    documentation: 'Import all Build123d classes.',
  },
];

export function registerBuild123dCompletions(monaco: Monaco): void {
  monaco.languages.registerCompletionItemProvider('python', {
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      return {
        suggestions: BUILD123D_COMPLETIONS.map((item) => ({
          label: item.label,
          kind: monaco.languages.CompletionItemKind.Class,
          detail: item.detail,
          documentation: item.documentation,
          insertText: item.insertText,
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        })),
      };
    },
  });
}
