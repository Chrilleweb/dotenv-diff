import { describe, it, expect } from 'vitest';
import {
  detectSecretsInSource,
  hasIgnoreComment,
  SUSPICIOUS_KEYS,
  PROVIDER_PATTERNS,
} from '../../src/core/security/secretDetectors.js';

describe('secretDetectors', () => {
  describe('hasIgnoreComment', () => {
    it('should detect single-line comment', () => {
      expect(hasIgnoreComment('// dotenv-diff-ignore')).toBe(true);
    });

    it('should detect multi-line comment', () => {
      expect(hasIgnoreComment('/* dotenv-diff-ignore */')).toBe(true);
    });

    it('should detect HTML comment', () => {
      expect(hasIgnoreComment('<!-- dotenv-diff-ignore -->')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(hasIgnoreComment('// DOTENV-DIFF-IGNORE')).toBe(true);
      expect(hasIgnoreComment('// Dotenv-Diff-Ignore')).toBe(true);
    });

    it('should allow spaces in comment', () => {
      expect(hasIgnoreComment('// dotenv diff ignore')).toBe(true);
    });

    it('should detect inline ignore comment', () => {
      expect(hasIgnoreComment('dotenv-diff-ignore')).toBe(true);
    });

    it('should return false for non-ignore comments', () => {
      expect(hasIgnoreComment('// just a regular comment')).toBe(false);
    });
  });
});
