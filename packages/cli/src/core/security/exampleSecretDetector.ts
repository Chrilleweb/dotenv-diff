import { PROVIDER_PATTERNS } from './secretDetectors.js';
import { shannonEntropyNormalized } from './entropy.js';
import type { ExampleSecretWarning } from '../../config/types.js';

/**
 * Detects potential secrets in a .env.example file.
 * @param env - An object representing the `.env.example` file (key-value pairs).
 * @returns An array of warnings about potential secrets.
 */
export function detectSecretsInExample(
  env: Record<string, string>,
): ExampleSecretWarning[] {
  const warnings: ExampleSecretWarning[] = [];

  for (const [key, rawValue] of Object.entries(env)) {
    if (!rawValue) continue;

    const value = rawValue.trim();

    // 1 — Skip placeholders
    if (
      value === '' ||
      value.toLowerCase() === 'example' ||
      value.toLowerCase() === 'placeholder' ||
      value.includes('your_') ||
      value.includes('<') ||
      value.includes('CHANGE_ME')
    ) {
      continue;
    }

    // 2 — Check provider patterns (AWS, Stripe, GitHub, JWT etc.)
    // Stop at the first match: a key should be reported at most once, otherwise
    // a value that matches several patterns (or a pattern *and* the entropy
    // check below) would surface the same key multiple times in the output.
    let matchedPattern = false;
    for (const rx of PROVIDER_PATTERNS) {
      if (rx.test(value)) {
        warnings.push({
          key,
          value,
          reason: 'Pattern',
          severity: 'high',
        });
        matchedPattern = true;
        break;
      }
    }
    if (matchedPattern) continue;

    // 3 — Check entropy (high randomness → real secret)
    if (value.length >= 24) {
      const entropy = shannonEntropyNormalized(value);
      if (entropy > 0.8) {
        warnings.push({
          key,
          value,
          reason: 'Entropy',
          severity: entropy > 0.92 ? 'high' : 'medium',
        });
      }
    }
  }

  return warnings;
}
