import {
  PROVIDER_PATTERNS,
  determineEntropySeverity,
} from './secretDetectors.js';
import { shannonEntropyNormalized } from './entropy.js';
import type { ExampleSecretWarning } from '../../config/types.js';
import { DEFAULT_EXAMPLE_FILE } from '../../config/constants.js';

/**
 * Minimum value length before the entropy check is worth running.
 * Deliberately lower than the code scanner's 32: an example file should hold
 * placeholders, so a shorter real-looking value is already suspicious there.
 */
const MIN_ENTROPY_LENGTH = 24;

/**
 * Normalized entropy above which a value is treated as a real secret.
 * Also stricter than the code scanner's 0.85, for the same reason.
 */
const ENTROPY_THRESHOLD = 0.8;

/**
 * Detects potential secrets in an example file.
 *
 * Messages and severity come from the same rules as the code secret scanner, so
 * a value reads and ranks the same whether it was found in source or in an
 * example file. Only the thresholds for flagging at all are stricter here.
 * @param env - An object representing the example file (key-value pairs).
 * @param file - Basename of the example file, for the report.
 * @returns An array of warnings about potential secrets.
 */
export function detectSecretsInExample(
  env: Record<string, string>,
  file: string = DEFAULT_EXAMPLE_FILE,
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
          file,
          message: 'matches known provider key pattern',
          severity: 'high',
        });
        matchedPattern = true;
        break;
      }
    }
    if (matchedPattern) continue;

    // 3 — Check entropy (high randomness → real secret)
    if (value.length >= MIN_ENTROPY_LENGTH) {
      const entropy = shannonEntropyNormalized(value);
      if (entropy > ENTROPY_THRESHOLD) {
        warnings.push({
          key,
          value,
          file,
          message: `found high-entropy string (len ${value.length}, H≈${entropy.toFixed(2)})`,
          severity: determineEntropySeverity(value.length),
        });
      }
    }
  }

  return warnings;
}
