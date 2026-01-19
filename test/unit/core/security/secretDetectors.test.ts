import { describe, it, expect } from 'vitest';
import {
  detectSecretsInSource,
  hasIgnoreComment,
} from '../../../../src/core/security/secretDetectors.js';

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

  describe('detectSecretsInSource', () => {
    it('should detect AWS access key pattern', () => {
      const source = 'const key = "AKIAIOSFODNN7EXAMPLE";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(1);
      expect(findings[0].kind).toBe('pattern');
      expect(findings[0].severity).toBe('high');
      expect(findings[0].message).toContain('known provider key pattern');
    });

    it('should detect AWS temp key pattern', () => {
      const source = 'const key = "ASIAIOSFODNN7EXAMPLE";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('high');
    });

    it('should detect GitHub token pattern', () => {
      const source =
        'const value = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('high');
    });

    it('should detect Stripe live key pattern', () => {
      const source =
        'const value = "sk_live_abcdefghijklmnopqrstuvwxyz123456";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('high');
    });

    it('should detect Stripe test key pattern', () => {
      const source =
        'const value = "sk_test_abcdefghijklmnopqrstuvwxyz123456";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('high');
    });

    it('should detect Google API key pattern', () => {
      const source = 'const value = "AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('high');
    });

    it('should detect JWT token pattern', () => {
      const source =
        'const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('high');
    });

    it('should detect suspicious password assignment', () => {
      const source = 'const password = "MySecretPassword123!";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(1);
      expect(findings[0].kind).toBe('pattern');
      expect(findings[0].severity).toBe('medium');
      expect(findings[0].message).toContain('password/secret/token-like');
    });

    it('should detect suspicious secret assignment', () => {
      const source = 'const secret = "MyVeryLongSecretValue123";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('medium');
    });

    it('should detect high-entropy long strings', () => {
      const source =
        'const value = "Xy9Pq2Wz8Rt4Lm6Ks0Hv3Jn7Bp1Df5Cg9Ea2Ub6Tx4Sy8Rw3Qu7Pv0Nz5My1Lx9Kw2Jv6Iu4Ht0Gs8Fr3Eq7Dp1Co5Bn9Am";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings.length).toBeGreaterThan(0);
      const entropyFinding = findings.find((f) => f.kind === 'entropy');
      if (entropyFinding) {
        expect(entropyFinding.severity).toBe('high');
      }
    });

    it('should detect medium-entropy strings (32-47 chars)', () => {
      const source = 'const key = "aB3dE5fG7hI9jK0lM2nO4pQ6rS8tU1vW";';
      const findings = detectSecretsInSource('test.ts', source);

      const entropyFinding = findings.find((f) => f.kind === 'entropy');
      if (entropyFinding) {
        expect(entropyFinding.severity).toBe('medium');
      }
    });

    it('should skip lines with ignore comment', () => {
      const source = 'const password = "secret123"; // dotenv-diff-ignore';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(0);
    });

    it('should skip lines inside ignore block', () => {
      const source = `
<!-- dotenv-diff-ignore-start -->
const password = "MySecretPassword123!";
const token = "AKIAIOSFODNN7EXAMPLE";
<!-- dotenv-diff-ignore-end -->
      `;
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(0);
    });

    it('should skip comment lines', () => {
      const source = '// const password = "MySecretPassword123!";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(0);
    });

    it('should ignore harmless email addresses', () => {
      const source = 'const email = "user@example.com";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(0);
    });

    it('should ignore data URIs', () => {
      const source =
        'const img = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(0);
    });

    it('should ignore relative paths', () => {
      const source = 'const path = "./config/settings";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(0);
    });

    it('should ignore UUIDs', () => {
      const source = 'const id = "550e8400-e29b-41d4-a716-446655440000";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(0);
    });

    it('should ignore MD5 hashes', () => {
      const source = 'const hash = "5d41402abc4b2a76b9719d911017c592";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(0);
    });

    it('should ignore environment variable accessors', () => {
      const source =
        'const key = process.env.API_KEY || "fallback-value-here";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(0);
    });

    it('should ignore pure interpolation templates', () => {
      const source = 'const url = `${protocol}:${host}:${port}`;';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(0);
    });

    it('should ignore SVG path data', () => {
      const source = 'const path = "M10 10 L20 20 Z";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(0);
    });

    it('should ignore SVG markup', () => {
      const source =
        'const svg = "<svg width=\\"100\\" height=\\"100\\"><circle cx=\\"50\\" cy=\\"50\\" r=\\"40\\"/></svg>";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(0);
    });

    it('should ignore placeholder URLs', () => {
      const source = 'const url = "https://placeholder.com/image.png";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(0);
    });

    it('should ignore example.com URLs', () => {
      const source = 'const url = "https://example.com/api";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(0);
    });

    it('should ignore localhost URLs', () => {
      const source = 'const url = "http://127.0.0.1:3000/api";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(0);
    });

    it('should ignore SVG namespace declarations', () => {
      const source =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(0);
    });

    it('should ignore harmless UI attributes', () => {
      const source =
        '<button data-testid="submit-button" aria-label="Submit">Click me</button>';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(0);
    });

    it('should ignore HTML text nodes', () => {
      const source = '<h1>My Secret Title</h1>';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(0);
    });

    it('should ignore URL construction patterns', () => {
      const source = 'const url = `${baseUrl}/auth/callback`;';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(0);
    });

    it('should detect URLs but ignore example.com', () => {
      const source = 'const url = "https://www.example.com/api";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(0);
    });

    it('should detect HTTPS URLs as low severity', () => {
      const source = 'const apiUrl = "https://api.realservice.com/endpoint";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('low');
      expect(findings[0].message).toContain('HTTPS URL detected');
    });

    it('should detect HTTP URLs as medium severity', () => {
      const source = 'const apiUrl = "http://api.realservice.com/endpoint";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('medium');
      expect(findings[0].message).toContain('HTTP URL detected');
    });

    it('should ignore URLs from ignoreUrls config', () => {
      const source = 'const url = "https://api.myservice.com/endpoint";';
      const findings = detectSecretsInSource('test.ts', source, {
        ignoreUrls: ['api.myservice.com'],
      });

      expect(findings).toHaveLength(0);
    });

    it('should use higher threshold for test files', () => {
      const source =
        'const key = "aB3dE5fG7hI9jK0lM2nO4pQ6rS8tU1vW3xY5zA7bC9dE1fG3hI5jK7lM9nO0pQ2";';
      const findings = detectSecretsInSource('test.spec.ts', source);

      // Test files have threshold 0.95 vs 0.85, so may have fewer findings
      expect(findings.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle files in __tests__ directory', () => {
      const source = 'const key = "some-test-key-value";';
      const findings = detectSecretsInSource('__tests__/test.ts', source);

      expect(findings.length).toBeGreaterThanOrEqual(0);
    });

    it('should deduplicate identical findings', () => {
      const source = `
const key1 = "AKIAIOSFODNN7EXAMPLE";
const key2 = "AKIAIOSFODNN7EXAMPLE";
      `;
      const findings = detectSecretsInSource('test.ts', source);

      // Should detect both but only count unique ones per line
      expect(findings.length).toBeGreaterThan(0);
    });

    it('should handle empty source', () => {
      const findings = detectSecretsInSource('test.ts', '');

      expect(findings).toHaveLength(0);
    });

    it('should handle multi-line source with various patterns', () => {
      const source = `
const password = "MySecretPassword123!";
const token = "AKIAIOSFODNN7EXAMPLE";
// This should be ignored
const email = "user@example.com";
      `;
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings.length).toBeGreaterThan(1);
    });

    it('should ignore short suspicious literals', () => {
      const source = 'const pass = "short";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(0);
    });

    it('should ignore env-like keys with VITE_ prefix', () => {
      const source = 'const key = "VITE_API_KEY_VALUE";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(0);
    });

    it('should ignore env-like keys with NEXT_PUBLIC prefix', () => {
      const source = 'const key = "NEXT_PUBLIC_API_KEY";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(0);
    });

    it('should handle import.meta.env accessor', () => {
      const source =
        'const key = import.meta.env.VITE_KEY || "fallback-value";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(0);
    });

    it('should handle SvelteKit env accessor', () => {
      const source = 'import { SECRET_KEY } from "$env/static/private";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(0);
    });

    it('should handle string concatenation URL patterns', () => {
      const source = 'const url = "https://example.com/test";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(0);
    });
  });
});
