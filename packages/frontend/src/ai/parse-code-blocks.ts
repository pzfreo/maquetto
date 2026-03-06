import type { CodeBlock } from '@maquetto/api-types';

const CODE_BLOCK_REGEX = /```(\w*)\n([\s\S]*?)```/g;

/**
 * Extract code blocks from AI response text.
 * Finds ```language\n...\n``` fences and returns their positions and content.
 */
export function parseCodeBlocks(text: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  let match: RegExpExecArray | null;

  // Reset regex state
  CODE_BLOCK_REGEX.lastIndex = 0;

  while ((match = CODE_BLOCK_REGEX.exec(text)) !== null) {
    blocks.push({
      language: match[1] ?? '',
      code: match[2] ?? '',
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return blocks;
}
