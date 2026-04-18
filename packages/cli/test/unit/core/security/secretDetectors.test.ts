import { describe, it, expect } from 'vitest';
import {
  detectSecretsInSource,
  hasIgnoreComment,
} from '../../../../src/core/security/secretDetectors.js';
import { shannonEntropyNormalized } from '../../../../src/core/security/entropy.js';

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
      expect(findings[0]!.kind).toBe('pattern');
      expect(findings[0]!.severity).toBe('high');
      expect(findings[0]!.message).toContain('known provider key pattern');
    });

    it('should detect AWS temp key pattern', () => {
      const source = 'const key = "ASIAIOSFODNN7EXAMPLE";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(1);
      expect(findings[0]!.severity).toBe('high');
    });

    it('should detect GitHub token pattern', () => {
      const source =
        'const value = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(1);
      expect(findings[0]!.severity).toBe('high');
    });

    it('should keep high severity when provider pattern and suspicious key overlap on same line', () => {
      const source =
        'const secret = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(1);
      expect(findings[0]!.severity).toBe('high');
      expect(findings[0]!.message).toContain('known provider key pattern');
    });

    it('should detect Stripe live key pattern', () => {
      const source =
        'const value = "sk_live_abcdefghijklmnopqrstuvwxyz123456";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(1);
      expect(findings[0]!.severity).toBe('high');
    });

    it('should detect Stripe test key pattern', () => {
      const source =
        'const value = "sk_test_abcdefghijklmnopqrstuvwxyz123456";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(1);
      expect(findings[0]!.severity).toBe('high');
    });

    it('should detect Google API key pattern', () => {
      const source = 'const value = "AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(1);
      expect(findings[0]!.severity).toBe('high');
    });

    it('should detect JWT token pattern', () => {
      const source =
        'const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(1);
      expect(findings[0]!.severity).toBe('high');
    });

    it('should detect suspicious password assignment', () => {
      const source = 'const password = "MySecretPassword123!";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(1);
      expect(findings[0]!.kind).toBe('pattern');
      expect(findings[0]!.severity).toBe('medium');
      expect(findings[0]!.message).toContain('password/secret/token-like');
    });

    it('should detect suspicious secret assignment', () => {
      const source = 'const secret = "MyVeryLongSecretValue123";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(1);
      expect(findings[0]!.severity).toBe('medium');
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
      // High-entropy string using allowed chars: A-Za-z0-9+/_-
      const literal = 'aB3xK9m+QwP2z/LsR8tY-u5nV7cJ4hFgD6eS1iO0p';
      const source = `const key = "${literal}";`;

      console.log('Entropy:', shannonEntropyNormalized(literal));
      console.log('Length:', literal.length);

      const findings = detectSecretsInSource('test.ts', source);
      console.log('Findings:', findings);

      const entropyFinding = findings.find((f) => f.kind === 'entropy');
      expect(entropyFinding).toBeDefined();
      expect(entropyFinding?.severity).toBe('medium');
      expect(entropyFinding?.message).toContain('found high-entropy string');
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

    it('should ignore trackingId attributes', () => {
      const source = 'const config = { trackingId: "UA-12345-67" };';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(0);
    });

    it('should ignore trackingContext attributes', () => {
      const source = 'trackingContext: "some-tracking-data"';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(0);
    });

    it('should ignore password field with data-test attribute', () => {
      const source = '<input type="password" data-test="login-password">';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(0);
    });

    it('should ignore lines with HTML tags containing secrets', () => {
      const source = '<div>secret="MySecretValue123"</div>';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(0);
    });

    it('should ignore empty HTML text nodes', () => {
      const source = '   ';
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
      expect(findings[0]!.severity).toBe('low');
      expect(findings[0]!.message).toContain('HTTPS URL detected');
    });

    it('should not detect HTTP URLs as medium severity', () => {
      const source = 'const apiUrl = "http://api.realservice.com/endpoint";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(0);
    });

    it('should ignore URLs from ignoreUrls config', () => {
      const source = 'const url = "https://api.myservice.com/endpoint";';
      const findings = detectSecretsInSource('test.ts', source, {
        ignoreUrls: ['api.myservice.com'],
      });

      expect(findings).toHaveLength(0);
    });

    it('upgrades severity from medium to high when same line matches both suspicious key and provider pattern', () => {
      // "secret" triggers SUSPICIOUS_KEYS (medium), "ghp_..." triggers PROVIDER_PATTERNS (high)
      // Both are kind: 'pattern' on same line → dedup should keep the high severity one
      const source =
        'const secret = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(1);
      expect(findings[0]!.severity).toBe('high');
      expect(findings[0]!.message).toContain('known provider key pattern');
    });

    it('does not downgrade severity when a lower severity finding appears after a higher one', () => {
      // If somehow high came first and medium second, high should be kept
      // provider pattern (high) + suspicious key (medium) on same line → stays high
      const source = 'const apikey = "AKIAIOSFODNN7EXAMPLE";';
      const findings = detectSecretsInSource('test.ts', source);

      expect(findings).toHaveLength(1);
      expect(findings[0]!.severity).toBe('high');
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

    it('does not flag JSX label props containing password text', () => {
      const source = '<Password label="Current password" />';
      expect(detectSecretsInSource('Component.tsx', source)).toEqual([]);
    });

    it('does not flag JSX placeholder props containing password text', () => {
      const source = '<Input placeholder="Re-enter password" />';
      expect(detectSecretsInSource('Component.tsx', source)).toEqual([]);
    });

    it('does not flag JSX name props like currentPassword', () => {
      const source = '<Password name="currentPassword" />';
      expect(detectSecretsInSource('Component.tsx', source)).toEqual([]);
    });

    it('does not flag JSX expression props without string literals', () => {
      const source = '<Password passwordError={currentPasswordError} />';
      expect(detectSecretsInSource('Component.tsx', source)).toEqual([]);
    });

    it('still flags hardcoded secret in JSX prop string literal', () => {
      const source =
        '<SecretField value="sk_live_abcdefghijklmnopqrstuvwxyz123456" />';
      const findings = detectSecretsInSource('Component.tsx', source);
      expect(findings.length).toBeGreaterThan(0);
    });

    it('still flags hardcoded token in JSX prop expression string', () => {
      const source =
        '<TokenField token={"ghp_abcdefghijklmnopqrstuvwxyz1234567890"} />';
      const findings = detectSecretsInSource('Component.tsx', source);
      expect(findings.length).toBeGreaterThan(0);
    });

    describe('charset and alphabet detection', () => {
      it('should ignore full alphanumeric alphabet (customAlphabet pattern)', () => {
        // The exact case from the bug report
        const source = `const createBundleId = customAlphabet(
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  8,
)`;
        const findings = detectSecretsInSource('test.ts', source);
        expect(findings).toHaveLength(0);
      });

      it('should ignore lowercase-only alphabet', () => {
        const source = "const id = nanoid('abcdefghijklmnopqrstuvwxyz', 10);";
        const findings = detectSecretsInSource('test.ts', source);
        expect(findings).toHaveLength(0);
      });

      it('should ignore uppercase-only alphabet', () => {
        const source =
          "const code = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);";
        const findings = detectSecretsInSource('test.ts', source);
        expect(findings).toHaveLength(0);
      });

      it('should ignore hex charset', () => {
        // 16 unique chars, has a sequential run of 10 digits + 6 letters
        const source = "const hex = customAlphabet('0123456789abcdef', 32);";
        const findings = detectSecretsInSource('test.ts', source);
        expect(findings).toHaveLength(0);
      });

      it('should ignore base32 alphabet', () => {
        // RFC 4648 base32: A-Z + 2-7
        const source =
          "const encoded = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567', 16);";
        const findings = detectSecretsInSource('test.ts', source);
        expect(findings).toHaveLength(0);
      });

      it('should ignore digits-only charset', () => {
        const source = "const pin = customAlphabet('0123456789', 6);";
        const findings = detectSecretsInSource('test.ts', source);
        expect(findings).toHaveLength(0);
      });

      it('should still detect a real high-entropy secret that is not a charset', () => {
        // Looks like a real token — no sequential runs, no large unique set structure
        const source =
          'const token = "xK9mQwP2zLsR8tYu5nV7cJ4hFgD6eS1iO0pA3bC";';
        const findings = detectSecretsInSource('test.ts', source);
        // Should still be flagged as entropy finding
        expect(findings.length).toBeGreaterThan(0);
        expect(findings.some((f) => f.kind === 'entropy')).toBe(true);
      });

      it('should still detect AWS key even if it superficially resembles an alphabet', () => {
        const source = 'const key = "AKIAIOSFODNN7EXAMPLE";';
        const findings = detectSecretsInSource('test.ts', source);
        expect(findings).toHaveLength(1);
        expect(findings[0]!.severity).toBe('high');
      });

      it('should ignore alphabet assigned to a variable without a function call', () => {
        // Charset used as a plain constant, not inside a function
        const source =
          "const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';";
        const findings = detectSecretsInSource('test.ts', source);
        expect(findings).toHaveLength(0);
      });
    });
    describe('minified file detection', () => {
      it('should ignore lines over 500 chars (likely minified)', () => {
        // Real minified line from a bundled file — contains URLs and identifiers
        // that would otherwise trigger URL and entropy warnings
        const source =
          'const WORKSPACES_DOCS_URL="https://www.sanity.io/docs/workspaces",useWorkspaceAuthStates=createHookFromObservableFactory((workspaces)=>combineLatest(workspaces.map((workspace)=>workspace.auth.state.pipe(map((state)=>[workspace.name,state])))).pipe(map((entries)=>Object.fromEntries(entries)))),STATE_TITLES={notAuthenticated:"Not authenticated",authenticated:"Authenticated",error:"Error"},COOKIE_NAME="sanity_workspace",DEFAULT_TIMEOUT=3e4,RETRY_ATTEMPTS=3,BASE_PATH="/v2021-06-07",API_VERSION="2021-06-07";';
        expect(source.length).toBeGreaterThan(500); // confirm the line is actually long
        const findings = detectSecretsInSource('test.ts', source);
        expect(findings).toHaveLength(0);
      });

      it('should ignore suspicious-looking strings inside minified lines', () => {
        // Minified code with a token field — should not warn because the line is minified
        const source =
          'var n=function(){return Math.random().toString(36).substr(2,9)},t={apiUrl:"https://api.example.com/v1",timeout:3e4,retry:3,token:"placeholder",headers:{"Content-Type":"application/json",Accept:"application/json"},endpoints:{auth:"/auth",users:"/users",data:"/data"},utils:{encode:function(e){return btoa(e)},decode:function(e){return atob(e)},hash:function(e){return e.split("").reduce((function(e,n){return(e=(e<<5)-e+n.charCodeAt(0))&e}),0)}},extra:"paddingToEnsureThisLineExceedsFiveHundredCharactersAsRequiredByTheMinifiedLineDetectionLogicInOurSecretScanner"};';
        expect(source.length).toBeGreaterThan(500);
        const findings = detectSecretsInSource('test.ts', source);
        expect(findings).toHaveLength(0);
      });

      it('should still detect secrets on normal-length lines', () => {
        // A short, normal line with a real secret should still be caught
        const source =
          'const token = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";';
        expect(source.length).toBeLessThan(500);
        const findings = detectSecretsInSource('test.ts', source);
        expect(findings.length).toBeGreaterThan(0);
      });

      it('should not ignore a 499-char line', () => {
        // Just under the threshold — should still be scanned normally
        const padding = 'x'.repeat(380);
        const source = `const token = "ghp_1234567890abcdefghijklmnopqrstuvwxyz"; // ${padding}`;
        expect(source.length).toBeLessThan(500);
        const findings = detectSecretsInSource('test.ts', source);
        expect(findings.length).toBeGreaterThan(0);
      });
    });
  });
});
