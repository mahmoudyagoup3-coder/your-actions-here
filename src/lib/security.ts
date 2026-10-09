/** Accepts only absolute https:// URLs (blocks javascript:, data:, http:, etc.). */
export function isSafeHttpsUrl(value: string | null | undefined): value is string {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!/^https:\/\//i.test(trimmed)) return false;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" && url.hostname.length > 0;
  } catch {
    return false;
  }
}

const SEGMENT = /^[a-z0-9-]{1,40}$/;

function safeSegment(value: string | undefined): string | null {
  if (!value) return null;
  const v = value.toLowerCase();
  return SEGMENT.test(v) ? v : null;
}

/** Builds a random storage path from whitelisted segments only (no path traversal). */
export function buildStoragePath(stage: string, level: string, track?: string): string {
  const parts = [safeSegment(stage) ?? "misc", safeSegment(level) ?? "misc"];
  const t = safeSegment(track);
  if (t) parts.push(t);
  return `${parts.join("/")}/${crypto.randomUUID()}.pdf`;
}

/** Strips characters that could be read as markup/instructions in AI context. */
export function sanitizeCatalogText(value: unknown, max = 150): string {
  return String(value ?? "")
    .replace(/[<>`{}\[\]\\]/g, " ")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, max);
}
