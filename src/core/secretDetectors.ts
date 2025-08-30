import { shannonEntropyNormalized } from './entropy.js';

export type SecretFinding = {
  file: string;
  line: number;
  kind: 'pattern' | 'entropy';
  message: string;
  snippet: string;
};

const SUSPICIOUS_KEYS =
  /\b(pass(word)?|secret|token|apikey|api_key|key|auth|bearer|private|client_secret|access[_-]?token)\b/i;

const PROVIDER_PATTERNS: RegExp[] = [
  /\bAKIA[0-9A-Z]{16}\b/, // AWS access key id
  /\bASIA[0-9A-Z]{16}\b/, // AWS temp key
  /\bghp_[0-9A-Za-z]{30,}\b/, // GitHub token
  /\bsk_live_[0-9a-zA-Z]{24,}\b/, // Stripe live secret
  /\bsk_test_[0-9a-zA-Z]{24,}\b/, // Stripe test secret
  /\bAIza[0-9A-Za-z\-_]{20,}\b/, // Google API key
];

const LONG_LITERAL = /["'`]{1}([A-Za-z0-9+/_\-]{24,})["'`]{1}/g;

function looksHarmlessLiteral(s: string): boolean {
  return /^https?:\/\//i.test(s) || /\S+@\S+/.test(s);
}

// Undgå støj fra typiske test/fixture/mock filer (meget konservativ liste)
function isProbablyTestPath(p: string): boolean {
  return (
    /\b(__tests__|__mocks__|fixtures|sandbox|samples)\b/i.test(p) ||
    /\.(spec|test)\.[jt]sx?$/.test(p)
  );
}

const DEFAULT_SECRET_THRESHOLD = 0.9 as const;

export function detectSecretsInSource(
  file: string,
  source: string,
): SecretFinding[] {
  const threshold = isProbablyTestPath(file) ? 0.95 : DEFAULT_SECRET_THRESHOLD;

  const findings: SecretFinding[] = [];
  const lines = source.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const line = lines[i];

    // 1) Suspicious key literal assignments
    if (SUSPICIOUS_KEYS.test(line)) {
      const m = line.match(/=\s*["'`](.+?)["'`]/);
      if (m && m[1] && !looksHarmlessLiteral(m[1]) && m[1].length >= 12) {
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
      const literal = lm[1];
      if (looksHarmlessLiteral(literal)) continue;
      if (literal.length < 32) continue; // ekstra støjfilter
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
  return findings;
}
