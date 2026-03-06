/**
 * Extract a short summary from AI response text (code blocks stripped).
 * Returns the first sentence, capped at 80 characters.
 */
export function extractSummary(text: string): string {
  // Strip code fences first
  const stripped = text.replace(/```[\s\S]*?```/g, '').trim();
  if (!stripped) return 'AI update';

  // First sentence: up to period, exclamation, or question mark followed by space/end
  const match = stripped.match(/^(.+?[.!?])(?:\s|$)/);
  const sentence = match ? match[1]! : stripped;

  if (sentence.length <= 80) return sentence;
  return sentence.slice(0, 77) + '...';
}
