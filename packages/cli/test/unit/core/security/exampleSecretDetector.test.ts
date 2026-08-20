import { describe, it, expect } from 'vitest';
import { detectSecretsInExample } from '../../../../src/core/security/exampleSecretDetector.js';
import { detectSecretsInSource } from '../../../../src/core/security/secretDetectors.js';
import {
  MIN_ENTROPY_LENGTH,
  HIGH_ENTROPY_LENGTH,
} from '../../../../src/config/constants.js';

describe('detectSecretsInExample', () => {
  it('skips empty and placeholder values', () => {
    const env = {
      EMPTY: '',
      EXAMPLE: 'example',
      PLACEHOLDER: 'placeholder',
      CHANGE: 'CHANGE_ME',
      TEMPLATE: '<your-value-here>',
      YOUR_VALUE: 'your_secret_here',
    };

    const warnings = detectSecretsInExample(env);
    expect(warnings).toHaveLength(0);
  });

  it('detects known provider key patterns', () => {
    const env = {
      AWS_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
      STRIPE_SECRET_KEY: 'sk_test_4eC39HqLyjWDarjtT1zdp7dc',
      GITHUB_TOKEN: 'ghp_16charactersexwqfdc12rf132fmple',
    };
    const warnings = detectSecretsInExample(env);

    expect(warnings).toHaveLength(3);
    for (const warning of warnings) {
      expect(warning.severity).toBe('high');
      expect(warning.message).toBe('matches known provider key pattern');
    }
  });

  it('ranks a value shorter than 48 chars as medium severity', () => {
    // 43 distinct characters. Entropy is normalized by log2(72), so a value has
    // to be both long and near-fully distinct to clear ENTROPY_THRESHOLD while
    // staying under HIGH_ENTROPY_LENGTH — the medium band is a narrow window.
    const env = {
      RANDOM_VALUE: 'q7Zm2Kx9Bv4Nc8Ld1Rt6Yw3Hs0Jp5Fg+Ae/Uk_Mi-Co',
    };

    const warnings = detectSecretsInExample(env);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.severity).toBe('medium');
    expect(warnings[0]!.message).toContain('found high-entropy string');
  });

  it('ranks a value of 48 chars or more as high severity', () => {
    const env = {
      RANDOM_VALUE:
        'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/',
    };

    const warnings = detectSecretsInExample(env);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.severity).toBe('high');
    expect(warnings[0]!.message).toContain('found high-entropy string');
  });

  it('ranks severity by length, not by how high the entropy is', () => {
    // Regression: severity used to key off entropy here and off length in the
    // code scanner, so this value was medium in an example file and high in
    // source — same string, same message, two different colours.
    const env = {
      LONG_BUT_NOT_EXTREME:
        'Xy9Pq2Wz8Rt4Lm6Ks0Hv3Jn7Bp1Df5Cg9Ea2Ub6Tx4Sy8Rw3Qu7Pv0Nz5My1Lx9Kw2Jv6Iu4Ht0Gs8Fr3Eq7Dp1Co5Bn9Am',
    };

    const warnings = detectSecretsInExample(env);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.message).toContain('H≈0.89');
    expect(warnings[0]!.severity).toBe('high');
  });

  it('does not flag long low-entropy values', () => {
    const env = {
      // >= 24 chars, so it reaches the entropy check, but the value is highly
      // repetitive (entropy ≈ 0), so the `entropy > 0.8` branch is false and no
      // warning is produced.
      REPEATED: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaa', // 28 chars
    };

    const warnings = detectSecretsInExample(env);
    expect(warnings).toHaveLength(0);
  });

  it('returns no warnings when nothing matches', () => {
    const env = {
      PORT: '3000',
      NODE_ENV: 'development',
      LOG_LEVEL: 'info',
    };

    const warnings = detectSecretsInExample(env);
    expect(warnings).toHaveLength(0);
  });

  describe('parity with the code secret scanner', () => {
    /** A value long enough to check, at each side of the severity boundary. */
    const atLength = (len: number): string =>
      'Xy9Pq2Wz8Rt4Lm6Ks0Hv3Jn7Bp1Df5Cg9Ea2Ub6Tx4Sy8Rw3Qu7Pv0Nz5My1Lx9Kw'.slice(
        0,
        len,
      );

    // Both scanners read MIN_ENTROPY_LENGTH / ENTROPY_THRESHOLD from constants,
    // so a value must be flagged — or not — the same way on both sides. They
    // ran on separate thresholds and separate severity rules once.
    it.each([
      [MIN_ENTROPY_LENGTH - 1, 'below the minimum length'],
      [MIN_ENTROPY_LENGTH, 'at the minimum length'],
      [HIGH_ENTROPY_LENGTH - 1, 'just below the high-severity length'],
      [HIGH_ENTROPY_LENGTH, 'at the high-severity length'],
    ])('agrees at length %i (%s)', (len) => {
      const value = atLength(len);

      const inExample = detectSecretsInExample({ KEY: value });
      const inCode = detectSecretsInSource('app.ts', `const key = "${value}";`);

      expect(inExample).toHaveLength(inCode.length);
      expect(inExample[0]?.severity).toBe(inCode[0]?.severity);
      expect(inExample[0]?.message).toBe(inCode[0]?.message);
    });

    it.each([
      [
        'Xy9Pq2Wz8Rt4Lm6Ks0Hv3Jn7Bp1Df5Cg9Ea2Ub6Tx4Sy8Rw3Qu7Pv0Nz5My1Lx9Kw2Jv6Iu4Ht0Gs8Fr3Eq7Dp1Co5Bn9Am',
        'a long high-entropy value',
      ],
      ['sk_live_abcdefghijklmnopqrstuvwx', 'a provider key'],
    ])('agrees on %#: %s', (value) => {
      const [inExample] = detectSecretsInExample({ KEY: value });
      const [inCode] = detectSecretsInSource(
        'app.ts',
        `const key = "${value}";`,
      );

      expect(inExample).toBeDefined();
      expect(inCode).toBeDefined();
      expect(inExample!.message).toBe(inCode!.message);
      expect(inExample!.severity).toBe(inCode!.severity);
    });
  });
});
