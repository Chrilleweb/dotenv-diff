import { describe, it, expect } from 'vitest';
import { detectSecretsInExample } from '../../src/core/security/exampleSecretDetector.js';

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
      expect(warning.reason).toContain('known provider key pattern');
    }
  });

  it('detects medium entropy values as medium severity', () => {
    const env = {
      RANDOM_VALUE: 'xA9fQ2LmZ7R8KpT3EwC0yD6nH1S5UOq4VJb', // ~36 chars, entropy > 0.8
    };

    const warnings = detectSecretsInExample(env);

    expect(warnings).toHaveLength(1);
    expect(warnings[0].severity).toBe('medium');
    expect(warnings[0].reason).toContain('High entropy value');
  });

  it('detects very high entropy values as high severity', () => {
    const env = {
      RANDOM_VALUE:
        'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/',
    };

    const warnings = detectSecretsInExample(env);

    expect(warnings).toHaveLength(1);
    expect(warnings[0].severity).toBe('high');
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
});
