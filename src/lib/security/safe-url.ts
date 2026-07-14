/**
 * Returns `url` only when it is a well-formed http(s) URL, otherwise null.
 *
 * Guards against rendering user-supplied links with dangerous schemes
 * (`javascript:`, `data:`, `vbscript:`) in an anchor's `href`, which would be a
 * click-to-execute XSS vector. Use at every point a stored URL becomes an
 * `href`, in addition to validating on write.
 */
export function safeExternalHref(
  url: string | null | undefined
): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:"
    ? url
    : null;
}

/** True when `url` is an acceptable http(s) URL (for validation schemas). */
export function isSafeHttpUrl(url: string): boolean {
  return safeExternalHref(url) !== null;
}
