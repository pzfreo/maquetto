/**
 * Extract a short summary from AI response text.
 * Looks for a **Summary:** line first (AI is prompted to include one),
 * then falls back to the first sentence.
 */
export function extractSummary(text: string): string {
  // Strip code fences first
  const stripped = text.replace(/```[\s\S]*?```/g, '').trim();
  if (!stripped) return 'AI update';

  // Look for **Summary:** pattern (case-insensitive)
  const summaryMatch = stripped.match(/\*\*Summary:\*\*\s*(.+)/i);
  if (summaryMatch) {
    const summary = summaryMatch[1]!.trim();
    if (summary.length <= 80) return summary;
    return summary.slice(0, 77) + '...';
  }

  // Fallback: first sentence
  const sentenceMatch = stripped.match(/^(.+?[.!?])(?:\s|$)/);
  const sentence = sentenceMatch ? sentenceMatch[1]! : stripped;

  if (sentence.length <= 80) return sentence;
  return sentence.slice(0, 77) + '...';
}
