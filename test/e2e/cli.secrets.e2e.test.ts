import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { makeTmpDir, rmrf } from '../utils/fs-helpers.js';
import { buildOnce, runCli, cleanupBuild } from '../utils/cli-helpers.js';

const tmpDirs: string[] = [];

beforeAll(() => {
  buildOnce();
});

afterAll(() => {
  cleanupBuild();
});

afterEach(() => {
  while (tmpDirs.length) {
    const dir = tmpDirs.pop();
    if (dir) rmrf(dir);
  }
});

function tmpDir() {
  const dir = makeTmpDir();
  tmpDirs.push(dir);
  return dir;
}

describe('secrets detection (default scan mode)', () => {
  it('warns on provider-like tokens and high-entropy literals (no CI break)', () => {
    const cwd = tmpDir();

    fs.writeFileSync(path.join(cwd, '.env'), 'API_KEY=\nNEW_API_KEY=\n');

    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'index.ts'),
      `
      // kendt mønster: GitHub PAT
      const gh = "ghp_1234567890ABCDEFGHijklmnopqrstuvwxYZ";

      // høj entropi & lang literal
      const password = "3fg400asipkfoemkfmojwpajwmdklaosjfiop";

      // lidt brug af env så stats/scan virker
      console.log(process.env.API_KEY, process.env.NEW_API_KEY);
    `.trimStart(),
    );

    const local = runCli(cwd, []);
    expect(local.status).toBe(0);
    expect(local.stdout).toContain('Potential secrets detected in codebase:');
    expect(local.stdout).toContain('src/index.ts');

    const ci = runCli(cwd, ['--ci']);
    expect(ci.status).toBe(0);
    expect(ci.stdout).toContain('Potential secrets detected in codebase:');
  });

  it('does not warn when no secrets are present', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env'), 'A=\n');
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'index.ts'),
      `
      // helt harmløst
      const a = "hello";
      console.log(a);
    `.trimStart(),
    );

    const res = runCli(cwd, []);
    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain('Potential secrets detected in codebase:');
  });
  it('does not warn on process.env and import.meta.env usage', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env'), 'USER_API=\nVITE_KEYCLOAK_URL=\n');
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'index.ts'),
      `
      // Skal ikke flagges som secrets
      const apiUrl = '${'process.env.USER_API'}/users/${'userId'}/reset-password';
      const tokenEndpoint = '${'import.meta.env.VITE_KEYCLOAK_URL'}/token';

      console.log(apiUrl, tokenEndpoint);
    `.trimStart(),
    );

    const res = runCli(cwd, []);
    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain('Potential secrets detected in codebase:');
  });
  it('does not warn on URL construction patterns with auth keywords', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env'), 'KEYCLOAK_BASE=\nREALM=\n');
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'auth.ts'),
      `
      // These should NOT be flagged as secrets - they're URL constructions
      window.location.href = \`\${baseURL}auth/login\`;
      
      const authUrl = \`\${keycloakBase}/realms/\${realm}/protocol/openid-connect/auth?client_id=test\`;
      const tokenUrl = \`\${keycloakBase}/realms/\${realm}/protocol/openid-connect/token\`;
      const authUrl = \`\${keycloakBase}/realms/\${realm}/protocol/openid-connect/auth?response_type=code&client_id=\${clientId}\`;
      const logoutUrl = \`\${keycloakBase}/realms/\${realm}/protocol/openid-connect/logout\`;

      const UUID = '123e4567-e89b-12d3-a456-426614174000'; // should not be flagged

      const SHA256Hash = '3f79bb7b435b05321651daefd374cd21b4f2d3a0a4f1e5e6e7f8a9b0c1d2e3f4'; // should not be flagged
      
      console.log(authUrl, redirectUrl, apiEndpoint);
    `.trimStart(),
    );

    const res = runCli(cwd, []);
    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain('Potential secrets detected in codebase:');
  });
  it('still warns on actual secrets with auth keywords', () => {
    const cwd = tmpDir();
    fs.writeFileSync(path.join(cwd, '.env'), 'DUMMY=\n');
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'secrets.ts'),
      `
      // These SHOULD be flagged as potential secrets
      const auth_token = "sk_live_abcxyz123456";
      const api_key = "AKIA1234567890ABCDEF";
      const client_secret = "very_secret_key_that_should_be_flagged_123";
      
      // But this URL should NOT be flagged
      const loginUrl = \`\${baseUrl}/auth/login\`;
      
      console.log(process.env.DUMMY);
    `.trimStart(),
    );

    const res = runCli(cwd, []);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Potential secrets detected in codebase:');
    expect(res.stdout).toContain('src/secrets.ts');
    // Should contain warnings for the actual secrets but not the URL
    expect(res.stdout).toMatch(/(auth_token|api_key|client_secret)/);
  });
  it('should not give warning on http://localhost*', () => {
    const cwd = tmpDir();

    fs.writeFileSync(path.join(cwd, '.env'), 'DUMMY=\n');
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'index.ts'),
      `
      const service = 'http://localhost:3000';
      const service2 = "http://localhost/api";
      const service3 = \`http://localhost:8080/path\`;

      console.log(service, service2, service3);
    `.trimStart(),
    );

    const res = runCli(cwd, []);
    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain('Potential secrets detected in codebase:');
  });
  it('should not give warning on localhost URLs in .env files', () => {
    const cwd = tmpDir();

    fs.writeFileSync(
      path.join(cwd, '.env'),
      `
      DUMMY=
      LOCAL_URL=http://localhost:3000
      ANOTHER_URL=http://localhost/api
      TEMPLATE_URL=http://localhost:8080/path
    `.trimStart(),
    );
    fs.writeFileSync(
      path.join(cwd, '.env.example'),
      `
      DUMMY=
      LOCAL_URL=http://localhost:3000
      ANOTHER_URL=http://localhost/api
      TEMPLATE_URL=http://localhost:8080/path
    `.trimStart(),
    );
    fs.writeFileSync(
      path.join(cwd, '.env.test'),
      `
      DUMMY=
      LOCAL_URL=http://localhost:3000
      ANOTHER_URL=http://localhost/api
      TEMPLATE_URL=http://localhost:8080/path
    `.trimStart(),
    );
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'index.ts'),
      `
      // lidt brug af env så stats/scan virker
      console.log(process.env.DUMMY);
    `.trimStart(),
    );

    const res = runCli(cwd, []);
    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain('Potential secrets detected in codebase:');
  });
  it('should not give warning on base64 ', () => {
    const cwd = tmpDir();

    fs.writeFileSync(path.join(cwd, '.env'), 'DUMMY=\n');
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'index.ts'),
      `
      // Base64 encoded string - should not be flagged
      const encoded = "SGVsbG8gV29ybGQh"; // "Hello World!" in Base64

      console.log(encoded);
    `.trimStart(),
    );

    const res = runCli(cwd, []);
    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain('Potential secrets detected in codebase:');
  });
  it('should warn about using https URLs in codebase', () => {
    const cwd = tmpDir();

    fs.writeFileSync(path.join(cwd, '.env'), 'DUMMY=\n');
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'index.ts'),
      `
      const service = 'https://example.com';
      const service2 = "https://example.com/api";
      const service3 = \`https://example.com:8080/path\`;

      console.log(service, service2, service3);
    `.trimStart(),
    );

    const res = runCli(cwd, []);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Potential secrets detected in codebase:');
  });
  it('should not give warning on SVG content', () => {
    const cwd = tmpDir();

    fs.writeFileSync(path.join(cwd, '.env'), 'DUMMY=\n');
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, 'src', 'index.ts'),
      `
      // SVG content - should not be flagged
      const svgIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red" /></svg>';

      console.log(svgIcon);
    `.trimStart(),
    );

    const res = runCli(cwd, []);
    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain('Potential secrets detected in codebase:');
  });
});