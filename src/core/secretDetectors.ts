import { shannonEntropyNormalized } from './entropy.js';

// Represents a secret finding in the source code.
export type SecretFinding = {
  file: string;
  line: number;
  kind: 'pattern' | 'entropy';
  message: string;
  snippet: string;
};

// Regular expressions for detecting suspicious keys and provider patterns
const SUSPICIOUS_KEYS =
  /\b(pass(word)?|secret|token|apikey|api_key|key|auth|bearer|private|client_secret|access[_-]?token)\b/i;

// Regular expressions for detecting provider patterns
const PROVIDER_PATTERNS: RegExp[] = [
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

const LONG_LITERAL = /["'`]{1}([A-Za-z0-9+/_\-]{24,})["'`]{1}/g;

const HTTPS_PATTERN = /["'`](https?:\/\/(?!localhost)[^"'`]*)["'`]/g;

// List of harmless URL patterns to ignore
const HARMLESS_URLS = [
  /https?:\/\/(www\.)?placeholder\.com/i,
  /https?:\/\/(www\.)?example\.com/i,
  /https?:\/\/127\.0\.0\.1(:\d+)?/i,
  /http:\/\/www\.w3\.org\/2000\/svg/i,
  /xmlns=["']http:\/\/www\.w3\.org\/2000\/svg["']/i, // SVG namespace
];

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
    HARMLESS_URLS.some((rx) => rx.test(s)) // Allowlisted URLs
  );
}

/**
 * Checks if a line looks like a URL construction pattern.
 * @param line - The line to check.
 * @returns True if the line looks like URL construction, false otherwise.
 */
function looksLikeUrlConstruction(line: string): boolean {
  // Check for template literals or string concatenation that looks like URLs
  return (
    // Template literals with URL-like patterns
    /=\s*`[^`]*\$\{[^}]+\}[^`]*\/[^`]*`/.test(line) ||
    // String concatenation with slashes
    /=\s*["'][^"']*\/[^"']*["']\s*\+/.test(line) ||
    // Contains common URL patterns
    /=\s*["'`][^"'`]*\/[^"'`]*(auth|api|login|redirect|callback|protocol)[^"'`]*\/[^"'`]*["'`]/.test(
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

// Threshold is the value between 0 and 1 that determines the sensitivity of the detection.
const DEFAULT_SECRET_THRESHOLD = 0.85 as const;

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
): SecretFinding[] {
  const threshold = isProbablyTestPath(file) ? 0.95 : DEFAULT_SECRET_THRESHOLD;

  const findings: SecretFinding[] = [];
  const lines = source.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const line = lines[i] || '';

    // Skip comments
    if (/^\s*\/\//.test(line)) continue;

    // Check for HTTPS URLs
    HTTPS_PATTERN.lastIndex = 0;
    let httpsMatch: RegExpExecArray | null;
    while ((httpsMatch = HTTPS_PATTERN.exec(line))) {
      const url = httpsMatch[1] || '';
      if (url && !looksHarmlessLiteral(url)) {
        const protocol = url.startsWith('https') ? 'HTTPS' : 'HTTP';

        findings.push({
          file,
          line: lineNo,
          kind: 'pattern',
          message: `${protocol} URL detected – consider moving to an environment variable`,
          snippet: line.trim().slice(0, 180),
        });
      }
    }

    // 1) Suspicious key literal assignments
    if (SUSPICIOUS_KEYS.test(line)) {
      const m = line!.match(/=\s*["'`](.+?)["'`]/);
      if (
        m &&
        m[1] &&
        !looksHarmlessLiteral(m[1]) &&
        !looksLikeUrlConstruction(line) &&
        m[1].length >= 12 &&
        !isEnvAccessor(line)
      ) {
        findings.push({
          file,
          line: lineNo,
          kind: 'pattern',
          message: 'matches password/secret/token-like literal assignment',
          snippet: line.trim().slice(0, 180),
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
          snippet: line.trim().slice(0, 180),
        });
      }
    }

    // 3) High-entropy long literals
    LONG_LITERAL.lastIndex = 0;
    let lm: RegExpExecArray | null;
    while ((lm = LONG_LITERAL.exec(line))) {
      const literal = lm[1] || '';
      if (looksHarmlessLiteral(literal)) continue;
      if (literal.length < 32) continue;
      const ent = shannonEntropyNormalized(literal);
      if (ent >= threshold) {
        findings.push({
          file,
          line: lineNo,
          kind: 'entropy',
          message: `found high-entropy string (len ${literal.length}, H≈${ent.toFixed(2)})`,
          snippet: line.trim().slice(0, 180),
        });
      }
    }
  }
  const uniqueFindings = findings.filter(
    (f, idx, arr) =>
      idx ===
      arr.findIndex(
        (other) =>
          other.file === f.file &&
          other.line === f.line &&
          other.snippet === f.snippet,
      ),
  );

  return uniqueFindings;
}
