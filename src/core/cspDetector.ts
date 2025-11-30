// Very lightweight CSP detectors – we only need to know "does some CSP exist?"
const META_CSP_PATTERN =
  /<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/i;

const HEADER_CSP_PATTERN =
  /(setHeader|header|append)\(\s*['"]Content-Security-Policy['"]/i;

const HELMET_CSP_PATTERN = /\bcontentSecurityPolicy\b/;

/**
 * Returns true if the source code looks like it configures a CSP.
 * We are deliberately generous: if we see "Content-Security-Policy" anywhere
 * in a realistic pattern, we treat CSP as present.
 */
export function hasCspInSource(source: string): boolean {
  if (META_CSP_PATTERN.test(source)) return true;
  if (HEADER_CSP_PATTERN.test(source)) return true;
  if (HELMET_CSP_PATTERN.test(source)) return true;

  // Fallback: plain token match – good enough for "CSP exists somewhere"
  if (/Content-Security-Policy/i.test(source)) return true;

  return false;
}
