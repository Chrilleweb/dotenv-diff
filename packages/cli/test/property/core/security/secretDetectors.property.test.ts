import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import {
  detectSecretsInSource,
  hasIgnoreComment,
  SUSPICIOUS_KEYS,
  PROVIDER_PATTERNS,
} from '../../../../src/core/security/secretDetectors.js';

/**
 * Property-based ("fuzz") tests for the secret detector.
 *
 * The detector runs many regexes over untrusted source text, so it is exactly
 * the kind of code fuzzing protects: it must never throw, must terminate on
 * pathological input (ReDoS guard), and must return well-formed findings.
 */
describe('secretDetectors (property-based)', () => {
  test('detectSecretsInSource never throws on arbitrary input', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (file, source) => {
        detectSecretsInSource(file, source);
      }),
      { numRuns: 2000 },
    );
  });

  test('detectSecretsInSource never throws on arbitrary unicode', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), (source) => {
        detectSecretsInSource('input.ts', source);
      }),
      { numRuns: 1000 },
    );
  });

  test('every finding is well-formed and points at a real line', () => {
    fc.assert(
      fc.property(fc.array(fc.string(), { maxLength: 40 }), (lines) => {
        const source = lines.join('\n');
        const lineCount = source.split(/\r?\n/).length;
        const findings = detectSecretsInSource('input.ts', source);
        for (const f of findings) {
          expect(f.line).toBeGreaterThanOrEqual(1);
          expect(f.line).toBeLessThanOrEqual(lineCount);
          expect(['pattern', 'entropy']).toContain(f.kind);
          expect(['low', 'medium', 'high']).toContain(f.severity);
          expect(f.snippet.length).toBeLessThanOrEqual(180);
        }
      }),
      { numRuns: 1000 },
    );
  });

  // ReDoS guard: adversarial repetition must not blow up any single regex.
  // If a pattern were catastrophically backtracking, this would hang and the
  // per-test timeout would fail the suite.
  test('regexes terminate quickly on adversarial repetition', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('a', 'A', '0', '=', '"', '$', ' ', 'sk_', 'AKIA', '/'),
        fc.integer({ min: 1000, max: 50000 }),
        (unit, reps) => {
          const payload = unit.repeat(reps);
          const start = performance.now();
          hasIgnoreComment(payload);
          SUSPICIOUS_KEYS.test(payload);
          for (const rx of PROVIDER_PATTERNS) rx.test(payload);
          detectSecretsInSource('input.ts', payload);
          // Each iteration should finish in well under a second.
          expect(performance.now() - start).toBeLessThan(1000);
        },
      ),
      { numRuns: 200 },
    );
  });

  test('ignore comments are detected regardless of surrounding noise', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (before, after) => {
        const clean = (s: string) => s.replace(/[\r\n]/g, ' ');
        const line = `${clean(before)} // dotenv-diff-ignore ${clean(after)}`;
        expect(hasIgnoreComment(line)).toBe(true);
      }),
      { numRuns: 1000 },
    );
  });
});
