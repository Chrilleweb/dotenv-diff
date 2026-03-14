import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { applyFixes } from '../../../src/core/fixEnv.js';

// helper to create temp files
function makeTempFile(name: string, content: string): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dotenv-diff-'));
  const filePath = path.join(tmpDir, name);
  fs.writeFileSync(filePath, content);
  return filePath;
}

describe('applyFixes', () => {
  let envPath: string;
  let examplePath: string;

  beforeEach(() => {
    envPath = makeTempFile('.env', '');
    examplePath = makeTempFile('.env.example', '');
  });

  afterEach(() => {
    // clean up
    try {
      fs.unlinkSync(envPath);
    } catch {}
    try {
      fs.unlinkSync(examplePath);
    } catch {}
  });

  it('removes duplicate keys from .env', () => {
    fs.writeFileSync(envPath, 'A=1\nB=2\nA=3\n');
    const { changed, result } = applyFixes({
      envPath,
      missingKeys: [],
      duplicateKeys: ['A'],
    });

    const finalContent = fs.readFileSync(envPath, 'utf-8');
    expect(changed).toBe(true);
    expect(result.removedDuplicates).toEqual(['A']);
    expect(finalContent).toBe('B=2\nA=3\n'); // last occurrence wins
  });

  it('adds missing keys to .env', () => {
    fs.writeFileSync(envPath, 'A=1\n');
    const { changed, result } = applyFixes({
      envPath,
      missingKeys: ['B', 'C'],
      duplicateKeys: [],
    });

    const finalContent = fs.readFileSync(envPath, 'utf-8');
    expect(changed).toBe(true);
    expect(result.addedEnv).toEqual(['B', 'C']);
    expect(finalContent).toContain('B=');
    expect(finalContent).toContain('C=');
  });

  it('does not duplicate keys in .env.example if already present', () => {
    fs.writeFileSync(examplePath, 'A=\nB=\n');
    const { changed, result } = applyFixes({
      envPath,
      missingKeys: ['B'],
      duplicateKeys: [],
    });

    const finalExample = fs.readFileSync(examplePath, 'utf-8');
    expect(finalExample.match(/^B=/gm)?.length).toBe(1); // only one B
  });

  it('returns no changes when nothing to fix', () => {
    fs.writeFileSync(envPath, 'A=1\n');
    fs.writeFileSync(examplePath, 'A=\n');
    const { changed, result } = applyFixes({
      envPath,
      missingKeys: [],
      duplicateKeys: [],
    });

    expect(changed).toBe(false);
    expect(result).toEqual({
      removedDuplicates: [],
      addedEnv: [],
      gitignoreUpdated: false,
    });
  });

  it('adds newline before missing keys when .env has no trailing newline', () => {
    fs.writeFileSync(envPath, 'A=1'); // no newline

    applyFixes({
      envPath,
      missingKeys: ['B'],
      duplicateKeys: [],
    });

    const finalContent = fs.readFileSync(envPath, 'utf-8');
    expect(finalContent).toBe('A=1\nB=\n');
  });

  it('adds missing keys to .env even when examplePath is undefined', () => {
    fs.writeFileSync(envPath, 'A=1\n');

    const { changed, result } = applyFixes({
      envPath,
      missingKeys: ['B'],
      duplicateKeys: [],
    });

    const env = fs.readFileSync(envPath, 'utf-8');
    expect(changed).toBe(true);
    expect(result.addedEnv).toEqual(['B']);
    expect(env).toContain('B=');
  });

  it('handles duplicateKeys list even if no duplicates exist in file', () => {
    fs.writeFileSync(envPath, 'A=1\nB=2\n');

    const { changed, result } = applyFixes({
      envPath,
      missingKeys: [],
      duplicateKeys: ['C'], // key not in file
    });

    const env = fs.readFileSync(envPath, 'utf-8');
    expect(changed).toBe(true); // still considered a change
    expect(result.removedDuplicates).toEqual(['C']);
    expect(env).toBe('A=1\nB=2\n');
  });

  it('removes multiple duplicate keys while preserving other lines', () => {
    fs.writeFileSync(
      envPath,
      `A=1
B=1
A=2
C=1
B=2
`,
    );

    applyFixes({
      envPath,
      missingKeys: [],
      duplicateKeys: ['A', 'B'],
    });

    const env = fs.readFileSync(envPath, 'utf-8');
    expect(env).toBe(`A=2\nC=1\nB=2\n`);
  });

  it('handles ensureGitignore=true without throwing (best-effort)', () => {
    const { changed } = applyFixes({
      envPath,
      missingKeys: [],
      duplicateKeys: [],
      ensureGitignore: true,
    });

    expect(changed).toBe(false);
  });

  describe('ensureGitignore functionality', () => {
    it('creates .gitignore when in git repo but no .gitignore exists', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dotenv-diff-'));
      fs.mkdirSync(path.join(tmpDir, '.git'));

      const envPath = path.join(tmpDir, '.env');
      fs.writeFileSync(envPath, 'A=1\n');

      const { changed, result } = applyFixes({
        envPath,
        missingKeys: [],
        duplicateKeys: [],
        ensureGitignore: true,
      });

      expect(changed).toBe(true);
      expect(result.gitignoreUpdated).toBe(true);

      const gitignorePath = path.join(tmpDir, '.gitignore');
      expect(fs.existsSync(gitignorePath)).toBe(true);

      const content = fs.readFileSync(gitignorePath, 'utf-8');
      expect(content).toContain('.env');

      // Cleanup
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('updates .gitignore when missing patterns', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dotenv-diff-'));
      fs.mkdirSync(path.join(tmpDir, '.git'));

      const envPath = path.join(tmpDir, '.env');
      fs.writeFileSync(envPath, 'A=1\n');

      const gitignorePath = path.join(tmpDir, '.gitignore');
      fs.writeFileSync(gitignorePath, 'node_modules/\n');

      const { changed, result } = applyFixes({
        envPath,
        missingKeys: [],
        duplicateKeys: [],
        ensureGitignore: true,
      });

      expect(changed).toBe(true);
      expect(result.gitignoreUpdated).toBe(true);

      const content = fs.readFileSync(gitignorePath, 'utf-8');
      expect(content).toContain('node_modules/');
      expect(content).toContain('.env');

      // Cleanup
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('does not update .gitignore when .env is already properly ignored', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dotenv-diff-'));
      fs.mkdirSync(path.join(tmpDir, '.git'));

      const envPath = path.join(tmpDir, '.env');
      fs.writeFileSync(envPath, 'A=1\n');

      const gitignorePath = path.join(tmpDir, '.gitignore');
      fs.writeFileSync(gitignorePath, '.env\n.env.*\n');

      const { changed, result } = applyFixes({
        envPath,
        missingKeys: [],
        duplicateKeys: [],
        ensureGitignore: true,
      });

      expect(result.gitignoreUpdated).toBe(false);

      // Cleanup
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('does not update .gitignore when not in a git repo', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dotenv-diff-'));

      const envPath = path.join(tmpDir, '.env');
      fs.writeFileSync(envPath, 'A=1\n');

      const { result } = applyFixes({
        envPath,
        missingKeys: [],
        duplicateKeys: [],
        ensureGitignore: true,
      });

      expect(result.gitignoreUpdated).toBe(false);

      // Cleanup
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('does not update .gitignore when all patterns already exist', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dotenv-diff-'));
      fs.mkdirSync(path.join(tmpDir, '.git'));

      const envPath = path.join(tmpDir, '.env');
      fs.writeFileSync(envPath, 'A=1\n');

      const gitignorePath = path.join(tmpDir, '.gitignore');
      // Write all DEFAULT_GITIGNORE_ENV_PATTERNS
      fs.writeFileSync(gitignorePath, '.env\n.env.*\n.env.local\n');

      const { result } = applyFixes({
        envPath,
        missingKeys: [],
        duplicateKeys: [],
        ensureGitignore: true,
      });

      expect(result.gitignoreUpdated).toBe(false);

      // Cleanup
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('returns false when gitignore exists with all patterns but has negation', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dotenv-diff-'));
      fs.mkdirSync(path.join(tmpDir, '.git'));

      const envPath = path.join(tmpDir, '.env');
      fs.writeFileSync(envPath, 'A=1\n');

      const gitignorePath = path.join(tmpDir, '.gitignore');
      // All patterns present but with negation that causes isEnvIgnoredByGit to return false
      fs.writeFileSync(gitignorePath, '!.env\n.env\n.env.*\n.env.local\n');

      const { result } = applyFixes({
        envPath,
        missingKeys: [],
        duplicateKeys: [],
        ensureGitignore: true,
      });

      // Should return false - all patterns exist so no update needed
      expect(result.gitignoreUpdated).toBe(false);

      // Cleanup
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('appends patterns to .gitignore without trailing newline', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dotenv-diff-'));
      fs.mkdirSync(path.join(tmpDir, '.git'));

      const envPath = path.join(tmpDir, '.env');
      fs.writeFileSync(envPath, 'A=1\n');

      const gitignorePath = path.join(tmpDir, '.gitignore');
      fs.writeFileSync(gitignorePath, 'node_modules/'); // no trailing newline

      const { result } = applyFixes({
        envPath,
        missingKeys: [],
        duplicateKeys: [],
        ensureGitignore: true,
      });

      expect(result.gitignoreUpdated).toBe(true);

      const content = fs.readFileSync(gitignorePath, 'utf-8');
      expect(content).toContain('node_modules/\n.env');

      // Cleanup
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('handles errors gracefully in updateGitignoreForEnv (catch block)', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dotenv-diff-'));
      fs.mkdirSync(path.join(tmpDir, '.git'));

      const envPath = path.join(tmpDir, '.env');
      fs.writeFileSync(envPath, 'A=1\n');

      const gitignorePath = path.join(tmpDir, '.gitignore');
      fs.writeFileSync(gitignorePath, 'node_modules/\n');

      // Make .gitignore read-only to trigger write error
      fs.chmodSync(gitignorePath, 0o444);

      const { result } = applyFixes({
        envPath,
        missingKeys: [],
        duplicateKeys: [],
        ensureGitignore: true,
      });

      // Should return false on error (non-blocking)
      expect(result.gitignoreUpdated).toBe(false);

      // Cleanup - restore permissions first
      fs.chmodSync(gitignorePath, 0o644);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
  });
});
