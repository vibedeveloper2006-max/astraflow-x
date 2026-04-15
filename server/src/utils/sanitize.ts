/**
 * Input sanitization utilities for the AstraFlow X API.
 * Strips HTML and script-like content from user-provided strings
 * to prevent XSS injection into AI prompts or log sinks.
 */

/**
 * Strips HTML tags and common script-injection patterns from a string.
 * Use this on any user-supplied content before passing it to AI services or logging.
 *
 * @param input - Raw user-provided string.
 * @param maxLength - Maximum allowed length (default: 1000).
 * @returns Sanitized string.
 */
export function sanitizeText(input: string, maxLength = 1000): string {
  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove script injection patterns
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    // Collapse excessive whitespace
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * Validates that a string is a safe zone ID (alphanumeric + hyphens/underscores only).
 *
 * @param id - Candidate zone ID string.
 * @returns `true` if safe, `false` otherwise.
 */
export function isSafeId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{1,64}$/.test(id);
}
