import { shannonEntropyNormalized } from './entropy.js';
import { isLikelyMinified } from '../helpers/isLikelyMinified.js';

/**
 * Severity levels for detected secrets
 */
export type SecretSeverity = 'high' | 'medium' | 'low';

/**
 * Represents a secret finding in the source code.
 */
export type SecretFinding = {
  file: string;
  line: number;
  kind: 'pattern' | 'entropy';
  message: string;
  snippet: string;
  severity: SecretSeverity;
};

// Regular expressions for detecting suspicious keys and provider patterns
export const SUSPICIOUS_KEYS =
  /\b(pass(word)?|secret|token|apikey|api_key|client_secret|access[_-]?token)\b/i;

// Regular expressions for detecting provider patterns
export const PROVIDER_PATTERNS: RegExp[] = [
  /\bAKIA[0-9A-Z]{16}\b/, // AWS access key id
  /\bASIA[0-9A-Z]{16}\b/, // AWS temp key
  /\bghp_[0-9A-Za-z]{30,}\b/, // GitHub token
  /\bsk_live_[0-9a-zA-Z]{24,}\b/, // Stripe live secret
  /\bsk_test_[0-9a-zA-Z]{24,}\b/, // Stripe test secret
  /\bAIza[0-9A-Za-z\-_]{20,}\b/, // Google API key
  /\bya29\.[0-9A-Za-z\-_]+\b/, // Google OAuth access token
  /\b[A-Za-z0-9_-]{21}:[A-Za-z0-9_-]{140}\b/, // Firebase token
  /\b0x[a-fA-F0-9]{40}\b/, // Ethereum address
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/, // JWT token
  /\bAC[0-9a-fA-F]{32}\b/, // Twilio Account SID
];

// Regex for detecting long literals — only 32+ chars are worth scrutinizing,
const LONG_LITERAL = /["'`]([A-Za-z0-9+/_\-]{32,})["'`]/g;

// Regex for detecting HTTPS URLs
const HTTPS_PATTERN = /["'`](https:\/\/(?!localhost)[^"'`]*)["'`]/g;

// List of harmless URL patterns to ignore
const HARMLESS_URLS = [
  /https?:\/\/(www\.)?placeholder\.com/i,
  /https?:\/\/(www\.)?example\.com/i,
  /https?:\/\/127\.0\.0\.1(:\d+)?/i,
  /http:\/\/www\.w3\.org\/2000\/svg/i,
  /xmlns=["']http:\/\/www\.w3\.org\/2000\/svg["']/i, // SVG namespace
];

// Known harmless attribute keys commonly used in UI components
const HARMLESS_UI_ATTRIBUTE_NAMES =
  /^(name|label|placeholder|title|alt|caption|helperText|description|text|htmlFor|id|data-testid|data-test|aria-label|type|autocomplete|inputmode|role|method|enctype|form)$/i;

/**
 * Checks if a string looks like a UI label or attribute value, which are often false positives in secret detection.
 * @param s - The string to check.
 * @returns True if the string looks like a UI label, false otherwise.
 */
function looksLikeUiLabel(s: string): boolean {
  return /\s/.test(s);
}

// Known harmless attribute keys commonly used in UI / analytics
const HARMLESS_ATTRIBUTE_KEYS =
  /\b(trackingId|trackingContext|data-testid|data-test|aria-label)\b/i;

// Checks if a line is an HTML text node or tag
function isHtmlTextNode(line: string): boolean {
  const trimmed = line.trim();

  // Starts with <tag> and ends with </tag> with text inside
  // OR is a self-contained HTML tag (even without closing tag on same line)
  return (
    (/^<[^>]+>[^<]*<\/[^>]+>$/.test(trimmed) &&
      !/=["'`][^"'`]*["'`]/.test(trimmed)) || // complete tag without suspicious assignment
    /^<[a-z][a-z0-9-]*(?:\s+[a-z-]+(?:=["'][^"']*["'])?)*\s*\/?>$/i.test(
      trimmed,
    ) // opening or self-closing tag
  );
}

/**
 * Determines the severity of an entropy-based secret finding.
 * Note: This function assumes literalLength >= 32 (filtered before calling).
 * @param literalLength The length of the literal string
 * @returns The severity level of the secret finding
 */
function determineEntropySeverity(literalLength: number): SecretSeverity {
  // HIGH: Very high-entropy long strings (48+ chars)
  if (literalLength >= 48) {
    return 'high';
  }

  // MEDIUM: Medium high-entropy strings (32-47 chars)
  return 'medium';
}

/**
 * Checks if a line has an ignore comment
 * fx: // dotenv-diff-ignore or /* dotenv-diff-ignore *\/ or <!-- dotenv-diff-ignore -->
 * @param line - The line to check
 * @returns True if the line should be ignored
 */
export function hasIgnoreComment(line: string): boolean {
  const normalized = line.trim();

  // Cheap linear pre-check: the directive token must appear at all. This short
  // circuits pathological lines (e.g. long runs of "/") before they reach the
  // comment-marker regexes below, whose unbounded `.*` would otherwise rescan
  // from every marker position and go quadratic (O(n²)) on the line length.
  if (!/dotenv[\s-]*diff[\s-]*ignore/i.test(normalized)) return false;

  // Allow mixed casing, extra spaces, and optional dashes
  return (
    /\/\/.*dotenv[\s-]*diff[\s-]*ignore/i.test(normalized) ||
    /\/\*.*dotenv[\s-]*diff[\s-]*ignore.*\*\//i.test(normalized) ||
    /<!--.*dotenv[\s-]*diff[\s-]*ignore.*-->/i.test(normalized) ||
    /\bdotenv[\s-]*diff[\s-]*ignore\b/i.test(normalized)
  );
}

/**
 * Checks if a URL should be ignored based on ignoreUrls from config.
 * @param url - The URL that might be a potential secret
 * @param ignoreUrls - List of URLs to ignore (from config)
 * @returns true if the URL matches any ignore pattern
 */
function ignoreUrlsMatch(url: string, ignoreUrls?: string[]): boolean {
  if (!ignoreUrls?.length) return false;

  // case-insensitive substring match
  return ignoreUrls.some((pattern) =>
    url.toLowerCase().includes(pattern.toLowerCase()),
  );
}

/**
 * Checks if a string looks like a character set / alphabet used for ID generation
 * or similar utilities (e.g. customAlphabet, nanoid, uuid generation).
 *
 * A charset string is characterised by:
 *   - Containing long runs of consecutive ASCII characters (a-z, A-Z, 0-9)
 *   - Low uniqueness ratio: many repeated character classes, few truly unique chars
 *     relative to string length
 *
 * Examples that should pass:
 *   'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' // dotenv-diff-ignore
 *   '0123456789abcdef'
 *   'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'   (base32 alphabet)
 */
function looksLikeCharset(s: string): boolean {
  // Must be reasonably long to bother checking
  if (s.length < 16) return false;

  // Unique character ratio: a charset reuses few characters relative to its length,
  // but more importantly its unique chars are a large fraction of the total charset
  // space (26 lc + 26 uc + 10 digits = 62). If >50% of the possible alphanumeric
  // chars appear, it's almost certainly a charset definition.
  const unique = new Set(s.replace(/[^A-Za-z0-9]/g, '')).size;
  if (unique >= 61) return true; // covers a-z (26), A-Z (26), 0-9 (10), or combos

  // Fallback: detect sequential runs of 6+ consecutive ASCII codes
  // e.g. 'abcdef', 'ABCDEF', '012345'
  const sequentialRunThreshold = 6;
  let maxRun = 1;
  let currentRun = 1;
  for (let i = 1; i < s.length; i++) {
    if (s.charCodeAt(i) === s.charCodeAt(i - 1)! + 1) {
      currentRun++;
      if (currentRun > maxRun) maxRun = currentRun;
    } else {
      currentRun = 1;
    }
  }

  return maxRun >= sequentialRunThreshold;
}

/**
 * Checks if a string looks like a harmless literal.
 * @param s - The string to check.
 * @returns True if the string looks harmless, false otherwise.
 */
function looksHarmlessLiteral(s: string): boolean {
  return (
    /\S+@\S+/.test(s) || // emails
    /^data:[a-z]+\/[a-z0-9.+-]+;base64,/i.test(s) || // data URIs
    /^\.{0,2}\//.test(s) || // relative paths
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) || // UUID
    /^[0-9a-f]{32,128}$/i.test(s) || // MD5, SHA1, SHA256, etc.
    /^[A-Za-z0-9+/_\-]{16,20}={0,2}$/.test(s) || // short base64
    /^[A-Za-z0-9+/_\-]*(_PUBLIC|_PRIVATE|VITE_|NEXT_PUBLIC|VUE_)[A-Za-z0-9+/_\-]*={0,2}$/.test(
      s,
    ) || // env-like keys
    /^[MmZzLlHhVvCcSsQqTtAa][0-9eE+.\- ,MmZzLlHhVvCcSsQqTtAa]*$/.test(s) || // SVG path data
    /<svg[\s\S]*?>[\s\S]*?<\/svg>/i.test(s) || // SVG markup
    HARMLESS_URLS.some((rx) => rx.test(s)) || // Allowlisted URLs
    looksLikeCharset(s) // character sets / alphabets used for ID generation
  );
}

/**
 * Checks if a string literal is itself a full URL (e.g. an API endpoint).
 *
 * Such literals routinely contain words like `token`, `auth`, or `secret`
 * inside their path (e.g. "https://api.example.com/v1/token/refresh"), which
 * would otherwise be flagged as a "token-like literal assignment". Full URLs
 * are already surfaced separately by {@link HTTPS_PATTERN} at `low` severity,
 * so the suspicious-key path should not double-report them as `medium`.
 *
 * Note: this intentionally lives outside {@link looksHarmlessLiteral} because
 * that helper gates the HTTPS detection itself — marking URLs harmless there
 * would suppress the low-severity HTTPS finding entirely.
 * @param s - The literal to check.
 * @returns True if the literal is a full or protocol-relative URL.
 */
function looksLikeUrlLiteral(s: string): boolean {
  return (
    /^[a-z][a-z0-9+.-]*:\/\//i.test(s) || // scheme://… (http, https, ws, ftp, …)
    /^\/\/[^/\s]+\//.test(s) // protocol-relative //host/…
  );
}

/**
 * Checks if a line looks like a URL construction pattern.
 * @param line - The line to check.
 * @returns True if the line looks like URL construction, false otherwise.
 */
function looksLikeUrlConstruction(line: string): boolean {
  // Allow an optional JSX expression brace between `=` and the literal, e.g.
  // `action={`${BASE}/auth/...`}` — otherwise the `{` breaks the `=`-anchor.
  // Check for template literals or string concatenation that looks like URLs
  return (
    // Template literals with URL-like patterns
    /=\s*\{?\s*`[^`]*\$\{[^}]+\}[^`]*\/[^`]*`/.test(line) ||
    // String concatenation with slashes
    /=\s*\{?\s*["'][^"']*\/[^"']*["']\s*\+/.test(line) ||
    // Contains common URL patterns
    /=\s*\{?\s*["'`][^"'`]*\/[^"'`]*(auth|api|login|redirect|callback|protocol)[^"'`]*\/[^"'`]*["'`]/.test(
      line,
    ) ||
    // Keycloak-specific patterns
    /realms\/.*\/protocol\/openid-connect/.test(line)
  );
}

/**
 * Checks if a file path is probably a test path.
 * This is determined by looking for common test folder names and file extensions.
 * @param p - The file path to check.
 * @returns True if the file path is probably a test path, false otherwise.
 */
function isProbablyTestPath(p: string): boolean {
  return (
    /\b(__tests__|__mocks__|fixtures|sandbox|samples)\b/i.test(p) ||
    /\.(spec|test)\.[jt]sx?$/.test(p)
  );
}

/**
 * Checks if a string is a template literal assembled from interpolated variables.
 *
 * A secret cannot be hardcoded through interpolation — the value comes from the
 * `${...}` expressions at runtime — so any template containing an interpolation
 * is a constructed string, not a literal secret assignment. This covers things
 * like React list-reconciliation keys (`secret-expanded-${slug}-${secretKey}`),
 * dynamic URLs, and cache keys, regardless of the static text around them.
 * @param s - The string to check.
 * @returns True if the string contains a `${...}` interpolation.
 */
function isInterpolatedTemplate(s: string): boolean {
  return /\$\{[^}]+\}/.test(s);
}

// Known credential value prefixes that mark a real secret regardless of its character mix.
const SECRET_VALUE_PREFIXES =
  /^(sk-|sk_|pk_|rk_|ghp_|gho_|ghu_|ghs_|ghr_|github_pat_|xox[baprs]-|eyJ|AKIA|ASIA|AIza|ya29\.)/;

// A single-class value only counts as a secret when it is both long and high-entropy.
const SINGLE_CLASS_MIN_LENGTH = 20 as const;
const SINGLE_CLASS_MIN_ENTROPY = 0.7 as const;

/**
 * Counts how many distinct character classes (lowercase, uppercase, digit) a value uses.
 * @param v - The value to inspect.
 * @returns The number of character classes present (0–3).
 */
function characterClassCount(v: string): number {
  let count = 0;
  if (/[a-z]/.test(v)) count++;
  if (/[A-Z]/.test(v)) count++;
  if (/[0-9]/.test(v)) count++;
  return count;
}

/**
 * Checks if a value is a delimited identifier — lowercase words/numbers joined by
 * `-`, `_`, or `.` (e.g. `secret-rotation-v2-rotate-secrets`, `inject-k8s-sa-auth-token`).
 *
 * These kebab/snake/dot slugs and enum constants are not credentials, but a version
 * suffix like `v2` or a token like `k8s` sneaks a digit in, pushing them to two
 * character classes (lowercase + digit) — which would otherwise trip the class-count
 * check in {@link looksLikeSecretValue}. Rejecting the whole shape up front keeps that
 * heuristic honest to its documented promise of ignoring identifier slugs.
 * @param v - The value to check.
 * @returns True when the value is a lowercase delimited identifier.
 */
function isDelimitedIdentifier(v: string): boolean {
  return /^[a-z0-9]+([._-][a-z0-9]+)+$/.test(v);
}

/**
 * Decides whether a value assigned to a suspiciously-named key actually looks like a
 * credential rather than a kebab/snake-case identifier or enum slug.
 *
 * Real credentials mix character classes (e.g. `MySecretPassword123`), carry a known
 * provider prefix (`sk_`, `ghp_`, `eyJ`, …), or are long high-entropy blobs. Slugs such
 * as `secret-scanning`, `reveal-secret`, or `x-gateway-upload-token` use a single
 * character class and low entropy, so they are rejected here. This is what stops the
 * suspicious-key heuristic from flagging identifier constants as secrets.
 * @param v - The literal value to evaluate.
 * @returns True when the value is shaped like a real credential.
 */
function looksLikeSecretValue(v: string): boolean {
  if (SECRET_VALUE_PREFIXES.test(v)) return true;
  if (isDelimitedIdentifier(v)) return false;
  if (characterClassCount(v) >= 2) return true;
  return (
    v.length >= SINGLE_CLASS_MIN_LENGTH &&
    shannonEntropyNormalized(v) >= SINGLE_CLASS_MIN_ENTROPY
  );
}

// Threshold is the value between 0 and 1 that determines the sensitivity of the detection.
const DEFAULT_SECRET_THRESHOLD = 0.85 as const;

// Maximum length of the source line stored on each finding's `snippet`.
const SNIPPET_MAX_LENGTH = 180 as const;

/**
 * Optimized for sveltekit and vite env accessors
 * @param line - A line of code to check.
 * @returns True if the line is an environment variable accessor, false otherwise.
 */
function isEnvAccessor(line: string): boolean {
  return /\b(process\.env|import\.meta\.env|\$env\/(static|dynamic)\/(public|private))\b/.test(
    line,
  );
}

/**
 * Detects secrets in the source code of a file.
 * @param file - The file path to check.
 * @param source - The source code to scan for secrets.
 * @returns An array of secret findings.
 */
export function detectSecretsInSource(
  file: string,
  source: string,
  opts?: { ignoreUrls?: string[] },
): SecretFinding[] {
  const threshold = isProbablyTestPath(file) ? 0.95 : DEFAULT_SECRET_THRESHOLD;

  const findings: SecretFinding[] = [];
  const lines = source.split(/\r?\n/);

  let insideIgnoreBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const line = lines[i] || '';

    if (/<!--\s*dotenv[\s-]*diff[\s-]*ignore[\s-]*start\s*-->/i.test(line)) {
      insideIgnoreBlock = true;
      continue;
    }

    if (/<!--\s*dotenv[\s-]*diff[\s-]*ignore[\s-]*end\s*-->/i.test(line)) {
      insideIgnoreBlock = false;
      continue;
    }

    // Skip if inside ignore block
    if (insideIgnoreBlock) continue;

    // Ignore likely minified / bundled lines before any secret detection.
    // This runs before the comment/ignore regexes so pathologically long lines
    // (e.g. bundled code with long runs of "/") never reach them.
    if (isLikelyMinified(line)) continue;

    // Skip comments
    if (/^\s*\/\//.test(line)) continue;

    // Check if line has ignore comment
    if (hasIgnoreComment(line)) continue;

    // Check for HTTPS URLs
    HTTPS_PATTERN.lastIndex = 0;
    let httpsMatch: RegExpExecArray | null;
    while ((httpsMatch = HTTPS_PATTERN.exec(line))) {
      const url = httpsMatch[1];
      if (url && !looksHarmlessLiteral(url)) {
        if (ignoreUrlsMatch(url, opts?.ignoreUrls)) continue;

        findings.push({
          file,
          line: lineNo,
          kind: 'pattern',
          message:
            'HTTPS URL detected – consider moving to an environment variable',
          snippet: line.trim().slice(0, SNIPPET_MAX_LENGTH),
          severity: 'low',
        });
      }
    }

    // 1) Suspicious key literal assignments
    if (SUSPICIOUS_KEYS.test(line)) {
      // Ignore known harmless UI / analytics attributes
      if (HARMLESS_ATTRIBUTE_KEYS.test(line)) continue;
      // Ignore HTML text nodes
      if (isHtmlTextNode(line)) continue;
      // Ignore if inside HTML tag content
      if (/<[^>]*>.*<\/[^>]*>/.test(line.trim())) continue;

      const attrMatch = line.match(
        /([:@A-Za-z0-9_-]+)\s*=\s*(?:\{\s*["'`](.+?)["'`]\s*\}|["'`](.+?)["'`])/,
      );

      if (!attrMatch) continue;

      const attrName = attrMatch[1];
      const literal = attrMatch[2] ?? attrMatch[3];

      // Skip common UI props like label, placeholder, name, etc.
      if (HARMLESS_UI_ATTRIBUTE_NAMES.test(attrName!)) continue;

      if (
        literal &&
        !looksHarmlessLiteral(literal) &&
        !looksLikeUiLabel(literal) &&
        !looksLikeUrlLiteral(literal) &&
        !looksLikeUrlConstruction(line) &&
        literal.length >= 12 &&
        looksLikeSecretValue(literal) &&
        !isEnvAccessor(line) &&
        !isInterpolatedTemplate(literal)
      ) {
        findings.push({
          file,
          line: lineNo,
          kind: 'pattern',
          message: 'matches password/secret/token-like literal assignment',
          snippet: line.trim().slice(0, SNIPPET_MAX_LENGTH),
          severity: 'medium',
        });
      }
    }

    // 2) Provider patterns
    for (const rx of PROVIDER_PATTERNS) {
      if (rx.test(line)) {
        findings.push({
          file,
          line: lineNo,
          kind: 'pattern',
          message: 'matches known provider key pattern',
          snippet: line.trim().slice(0, SNIPPET_MAX_LENGTH),
          severity: 'high',
        });
      }
    }

    // 3) High-entropy long literals
    LONG_LITERAL.lastIndex = 0;
    let lm: RegExpExecArray | null;
    while ((lm = LONG_LITERAL.exec(line))) {
      const literal = lm[1]!;
      if (looksHarmlessLiteral(literal)) continue;
      const ent = shannonEntropyNormalized(literal);
      if (ent >= threshold) {
        const message = `found high-entropy string (len ${literal.length}, H≈${ent.toFixed(2)})`;
        findings.push({
          file,
          line: lineNo,
          kind: 'entropy',
          message,
          snippet: line.trim().slice(0, SNIPPET_MAX_LENGTH),
          severity: determineEntropySeverity(literal.length),
        });
      }
    }
  }
  const severityRank: Record<SecretSeverity, number> = {
    low: 0,
    medium: 1,
    high: 2,
  };

  const deduped = new Map<string, SecretFinding>();

  for (const finding of findings) {
    const key = `${finding.file}|${finding.line}|${finding.snippet}|${finding.kind}`;
    const existing = deduped.get(key);

    if (!existing) {
      deduped.set(key, finding);
      continue;
    }

    if (severityRank[finding.severity] > severityRank[existing.severity]) {
      deduped.set(key, finding);
    }
  }

  return Array.from(deduped.values());
}
