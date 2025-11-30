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
  // 1. META tag
  if (META_CSP_PATTERN.test(source)) return true;

  // 2. Node header setters
  if (HEADER_CSP_PATTERN.test(source)) return true;

  // 3. Helmet or similar middleware
  if (HELMET_CSP_PATTERN.test(source)) return true;

  // 4. Plain fallback
  if (/Content-Security-Policy/i.test(source)) return true;

  // 5. SvelteKit kit.csp
  if (/kit\s*:\s*{[^}]*csp\s*:/s.test(source)) return true;

  // 6. A variable named <something>Csp or cspConfig or sharedCsp
  if (/\b(shared|global|site|app)[A-Z]?Csp\b/.test(source)) return true;
  if (/\bcspConfig\b/i.test(source)) return true;
  if (/\bcsp\s*:\s*{[^}]*['"]default-src['"]:/i.test(source)) return true;

  // 7. Directives object pattern (strong indicator)
  if (/directives\s*:\s*{[^}]*['"]default-src['"]:/is.test(source)) return true;

  return false;
}
