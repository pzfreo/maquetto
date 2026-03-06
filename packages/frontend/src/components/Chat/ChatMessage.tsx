import { parseCodeBlocks } from '../../ai/parse-code-blocks';
import { PartBadge } from './PartBadge';
import type { ReactNode } from 'react';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

const PART_REF_REGEX = /@(\d+)/g;

function renderTextWithPartRefs(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  PART_REF_REGEX.lastIndex = 0;
  while ((match = PART_REF_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const partId = `@${match[1]}`;
    parts.push(<PartBadge key={`${match.index}-${partId}`} partId={partId} />);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === 'user';

  // Parse code blocks from assistant messages
  const codeBlocks = isUser ? [] : parseCodeBlocks(content);

  // Build rendered content — strip code blocks, show indicator instead
  const rendered: ReactNode[] = [];
  let lastEnd = 0;

  for (let i = 0; i < codeBlocks.length; i++) {
    const block = codeBlocks[i]!;

    // Text before this code block
    if (block.startIndex > lastEnd) {
      const textBefore = content.slice(lastEnd, block.startIndex);
      rendered.push(
        <span key={`text-${i}`}>{renderTextWithPartRefs(textBefore)}</span>,
      );
    }

    // Show a small indicator instead of the code block
    rendered.push(
      <div
        key={`code-${i}`}
        style={{
          margin: '4px 0',
          padding: '4px 10px',
          borderRadius: '4px',
          background: 'rgba(74, 158, 255, 0.1)',
          border: '1px solid rgba(74, 158, 255, 0.2)',
          fontSize: '11px',
          color: '#4a9eff',
          fontStyle: 'italic',
        }}
      >
        Code applied to editor
      </div>,
    );

    lastEnd = block.endIndex;
  }

  // Remaining text
  if (lastEnd < content.length) {
    const remaining = content.slice(lastEnd);
    rendered.push(
      <span key="text-end">{renderTextWithPartRefs(remaining)}</span>,
    );
  }

  return (
    <div
      style={{
        padding: '10px 14px',
        borderRadius: '8px',
        margin: '6px 0',
        background: isUser ? '#2a2a4e' : '#1e1e2e',
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '95%',
        fontSize: '13px',
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      <div
        style={{
          fontSize: '10px',
          color: '#666',
          marginBottom: '4px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        {isUser ? 'You' : 'AI'}
      </div>
      <div>{rendered}</div>
    </div>
  );
}
