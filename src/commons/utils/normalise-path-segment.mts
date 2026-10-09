/**
 * Normalise a URL path segment from an environment variable.
 * - Empty / whitespace-only values return an empty string (no prefix).
 * - Otherwise, strips any trailing slashes and ensures exactly one leading slash.
 *
 * Examples:
 *   ""             → ""
 *   "v1"           → "/v1"
 *   "/v1"          → "/v1"
 *   "/v1/"         → "/v1"
 *   "interventions/" → "/interventions"
 */
export function normalisePathSegment(value: string): string {
  let trimmed = value.trim();
  if (trimmed.endsWith('/')) trimmed = trimmed.slice(0, -1); // strip trailing slashes
  if (!trimmed) return '';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}
