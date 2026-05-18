export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function shouldUseGoogleTranslate(text: string): boolean {
  return countWords(text) <= 2;
}