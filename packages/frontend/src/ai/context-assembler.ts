import type { CADContext } from '@maquetto/api-types';

/**
 * Assembles CAD context into a text description for AI prompts.
 * This is injected as a system-level preamble before each user message.
 */
export function assembleContextText(context: CADContext): string {
  const sections: string[] = [];

  // Current code
  if (context.code.trim()) {
    sections.push(`## Current Code\n\`\`\`python\n${context.code}\n\`\`\``);
  }

  // Part metadata
  if (context.parts.length > 0) {
    const partDescriptions = context.parts.map((p) => {
      const bb = p.boundingBox;
      const size = [
        (bb.max[0] - bb.min[0]).toFixed(1),
        (bb.max[1] - bb.min[1]).toFixed(1),
        (bb.max[2] - bb.min[2]).toFixed(1),
      ].join(' × ');

      const volumeStr = p.volume !== null ? `, volume: ${p.volume.toFixed(1)}` : '';
      return `- ${p.id}: ${size}mm, ${p.faceCount} faces${volumeStr}`;
    });

    sections.push(`## Parts in Viewport\n${partDescriptions.join('\n')}`);
  }

  // Selected parts
  if (context.selectedPartIds.length > 0) {
    sections.push(
      `## Selected Parts\n${context.selectedPartIds.join(', ')}`,
    );
  }

  // Camera
  if (context.cameraDescription) {
    sections.push(`## Camera\n${context.cameraDescription}`);
  }

  return sections.join('\n\n');
}
