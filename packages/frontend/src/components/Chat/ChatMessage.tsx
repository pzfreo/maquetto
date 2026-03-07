import { useState } from 'react';
import { parseCodeBlocks } from '../../ai/parse-code-blocks';
import { PartBadge } from './PartBadge';
import type { ReactNode } from 'react';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  hasScreenshot?: boolean;
}

const PART_REF_REGEX = /@(\d+)/g;
const CONTEXT_SEPARATOR = '\n\n---\n';

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

export function ChatMessage({ role, content, hasScreenshot }: ChatMessageProps) {
  const isUser = role === 'user';
  const [contextExpanded, setContextExpanded] = useState(false);

  // For user messages, split off the appended context
  const contextIndex = isUser ? content.indexOf(CONTEXT_SEPARATOR) : -1;
  const userText = contextIndex >= 0 ? content.slice(0, contextIndex) : content;
  const contextText = contextIndex >= 0 ? content.slice(contextIndex + CONTEXT_SEPARATOR.length) : null;

  // Parse code blocks from assistant messages
  const codeBlocks = isUser ? [] : parseCodeBlocks(content);

  // Build rendered content — strip code blocks, show indicator instead
  const rendered: ReactNode[] = [];
  let lastEnd = 0;

  if (isUser) {
    // User message: show user text, with collapsible context
    rendered.push(
      <span key="user-text">{renderTextWithPartRefs(userText)}</span>,
    );
    if (hasScreenshot) {
      rendered.push(
        <div
          key="screenshot-badge"
          style={{
            display: 'inline-block',
            marginTop: '4px',
            padding: '2px 8px',
            borderRadius: '4px',
            background: 'rgba(74, 158, 255, 0.1)',
            border: '1px solid rgba(74, 158, 255, 0.2)',
            fontSize: '11px',
            color: '#4a9eff',
          }}
        >
          Screenshot attached
        </div>,
      );
    }
    if (contextText) {
      rendered.push(
        <div key="context-toggle" style={{ marginTop: '4px' }}>
          <button
            onClick={() => setContextExpanded(!contextExpanded)}
            style={{
              padding: '2px 6px',
              borderRadius: '3px',
              border: '1px solid #444',
              background: 'transparent',
              color: '#666',
              fontSize: '10px',
              cursor: 'pointer',
            }}
          >
            {contextExpanded ? 'Hide context' : 'Show context'}
          </button>
          {contextExpanded && (
            <pre
              style={{
                marginTop: '4px',
                padding: '6px 8px',
                borderRadius: '4px',
                background: 'rgba(0,0,0,0.2)',
                fontSize: '10px',
                color: '#666',
                lineHeight: 1.4,
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
              }}
            >
              {contextText}
            </pre>
          )}
        </div>,
      );
    }
  } else {
    // Assistant message: strip code blocks
    for (let i = 0; i < codeBlocks.length; i++) {
      const block = codeBlocks[i]!;

      if (block.startIndex > lastEnd) {
        const textBefore = content.slice(lastEnd, block.startIndex);
        rendered.push(
          <span key={`text-${i}`}>{renderTextWithPartRefs(textBefore)}</span>,
        );
      }

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

    if (lastEnd < content.length) {
      const remaining = content.slice(lastEnd);
      rendered.push(
        <span key="text-end">{renderTextWithPartRefs(remaining)}</span>,
      );
    }
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
