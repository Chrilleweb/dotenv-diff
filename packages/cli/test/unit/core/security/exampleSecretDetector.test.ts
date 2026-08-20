import { describe, it, expect } from 'vitest';
import { detectSecretsInExample } from '../../../../src/core/security/exampleSecretDetector.js';
import { detectSecretsInSource } from '../../../../src/core/security/secretDetectors.js';

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
    const env = {
      RANDOM_VALUE: 'xA9fQ2LmZ7R8KpT3EwC0yD6nH1S5UOq4VJb', // 35 chars, entropy > 0.8
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
    // The same value must read and rank the same in both reports. These ran on
    // separate severity rules once — length in source, entropy in the example —
    // so an identical string was a red error in code and a yellow warning here.
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
