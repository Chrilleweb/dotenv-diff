import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  promptEnsureFiles,
  toExampleContent,
} from '../../../../src/commands/prompts/promptEnsureFiles.js';

// ---- mocks ----
vi.mock('../../../../src/commands/prompts/prompts.js', () => ({
  confirmYesNo: vi.fn(),
}));

vi.mock('../../../../src/ui/compare/printPrompt.js', () => ({
  printPrompt: {
    noEnvFound: vi.fn(),
    missingEnv: vi.fn(),
    skipCreation: vi.fn(),
    envCreated: vi.fn(),
    exampleCreated: vi.fn(),
  },
}));

vi.mock('../../../../src/services/git.js', () => ({
  warnIfEnvNotIgnored: vi.fn(),
}));

import { confirmYesNo } from '../../../../src/commands/prompts/prompts.js';
import { printPrompt } from '../../../../src/ui/compare/printPrompt.js';

describe('promptEnsureFiles', () => {
  let cwd: string;

  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'dotenv-diff-'));
  });

  afterEach(() => {
    fs.rmSync(cwd, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it('includes Do you want to create message in the confirmYesNo prompt text', async () => {
    fs.writeFileSync(path.join(cwd, '.env.example'), 'FOO=bar');

    vi.mocked(confirmYesNo).mockResolvedValue(true);

    await promptEnsureFiles({
      cwd,
      primaryEnv: '.env',
      primaryExample: '.env.example',
      alreadyWarnedMissingEnv: false,
      isYesMode: false,
      isCiMode: false,
    });

    expect(confirmYesNo).toHaveBeenCalledWith(
      expect.stringContaining('Do you want to create'),
      expect.any(Object),
    );
  });

  it('exits when neither .env nor .env.example exists', async () => {
    const result = await promptEnsureFiles({
      cwd,
      primaryEnv: '.env',
      primaryExample: '.env.example',
      alreadyWarnedMissingEnv: false,
      isYesMode: false,
      isCiMode: false,
    });

    expect(result).toEqual({
      didCreate: false,
      shouldExit: true,
      exitCode: 0,
    });
  });

  it('does not create .env when user declines', async () => {
    fs.writeFileSync(path.join(cwd, '.env.example'), 'FOO=bar');

    vi.mocked(confirmYesNo).mockResolvedValue(false);

    const result = await promptEnsureFiles({
      cwd,
      primaryEnv: '.env',
      primaryExample: '.env.example',
      alreadyWarnedMissingEnv: false,
      isYesMode: false,
      isCiMode: false,
    });

    expect(fs.existsSync(path.join(cwd, '.env'))).toBe(false);
    expect(result.shouldExit).toBe(true);
  });

  it('creates .env when user confirms via interactive prompt', async () => {
    fs.writeFileSync(path.join(cwd, '.env.example'), 'FOO=bar');

    vi.mocked(confirmYesNo).mockResolvedValue(true);

    const result = await promptEnsureFiles({
      cwd,
      primaryEnv: '.env',
      primaryExample: '.env.example',
      alreadyWarnedMissingEnv: false,
      isYesMode: false,
      isCiMode: false,
    });

    const envPath = path.join(cwd, '.env');

    expect(fs.existsSync(envPath)).toBe(true);
    expect(fs.readFileSync(envPath, 'utf-8')).toBe('FOO=bar');
    expect(result).toEqual({
      didCreate: true,
      shouldExit: false,
      exitCode: 0,
    });
  });

  it('does not exit when another .env* file exists', async () => {
    fs.writeFileSync(path.join(cwd, '.env.local'), 'FOO=bar');

    const result = await promptEnsureFiles({
      cwd,
      primaryEnv: '.env',
      primaryExample: '.env.example',
      alreadyWarnedMissingEnv: false,
      isYesMode: false,
      isCiMode: false,
    });

    expect(result.shouldExit).toBe(false);
  });

  it('skips creating .env.example when user declines', async () => {
    fs.writeFileSync(path.join(cwd, '.env'), 'FOO=bar');

    vi.mocked(confirmYesNo).mockResolvedValue(false);

    const result = await promptEnsureFiles({
      cwd,
      primaryEnv: '.env',
      primaryExample: '.env.example',
      alreadyWarnedMissingEnv: false,
      isYesMode: false,
      isCiMode: false,
    });

    expect(fs.existsSync(path.join(cwd, '.env.example'))).toBe(false);
    expect(result).toEqual({
      didCreate: false,
      shouldExit: true,
      exitCode: 0,
    });
  });

  it('does not create .env in CI mode when missing', async () => {
    fs.writeFileSync(path.join(cwd, '.env.example'), 'FOO=bar');

    const result = await promptEnsureFiles({
      cwd,
      primaryEnv: '.env',
      primaryExample: '.env.example',
      alreadyWarnedMissingEnv: false,
      isYesMode: false,
      isCiMode: true,
    });

    expect(fs.existsSync(path.join(cwd, '.env'))).toBe(false);
    expect(result).toEqual({
      didCreate: false,
      shouldExit: true,
      exitCode: 0,
    });
  });

  it('does not warn again if alreadyWarnedMissingEnv is true', async () => {
    fs.writeFileSync(path.join(cwd, '.env.example'), 'FOO=bar');

    await promptEnsureFiles({
      cwd,
      primaryEnv: '.env',
      primaryExample: '.env.example',
      alreadyWarnedMissingEnv: true,
      isYesMode: false,
      isCiMode: false,
    });

    expect(printPrompt.missingEnv).not.toHaveBeenCalled();
  });

  it('does not warn again if alreadyWarnedMissingEnv is true for .env.example', async () => {
    fs.writeFileSync(path.join(cwd, '.env'), 'FOO=bar');

    const result = await promptEnsureFiles({
      cwd,
      primaryEnv: '.env',
      primaryExample: '.env.example',
      alreadyWarnedMissingEnv: true,
      isYesMode: false,
      isCiMode: false,
    });

    expect(printPrompt.missingEnv).not.toHaveBeenCalled();
    expect(result).toEqual({
      didCreate: false,
      shouldExit: true,
      exitCode: 0,
    });
  });

  it('does not create .env.example in CI mode when missing', async () => {
    fs.writeFileSync(path.join(cwd, '.env'), 'FOO=bar');

    const result = await promptEnsureFiles({
      cwd,
      primaryEnv: '.env',
      primaryExample: '.env.example',
      alreadyWarnedMissingEnv: false,
      isYesMode: false,
      isCiMode: true,
    });

    expect(fs.existsSync(path.join(cwd, '.env.example'))).toBe(false);
    expect(result).toEqual({
      didCreate: false,
      shouldExit: true,
      exitCode: 0,
    });
  });

  it('creates .env from .env.example when --yes is set', async () => {
    fs.writeFileSync(path.join(cwd, '.env.example'), 'FOO=bar');

    const result = await promptEnsureFiles({
      cwd,
      primaryEnv: '.env',
      primaryExample: '.env.example',
      alreadyWarnedMissingEnv: false,
      isYesMode: true,
      isCiMode: false,
    });

    const envPath = path.join(cwd, '.env');

    expect(fs.existsSync(envPath)).toBe(true);
    expect(fs.readFileSync(envPath, 'utf-8')).toBe('FOO=bar');
    expect(result.shouldExit).toBe(false);
  });

  it('creates .env.example with stripped values from .env', async () => {
    fs.writeFileSync(
      path.join(cwd, '.env'),
      `
# comment
FOO=bar
BAZ=123
`,
    );

    const result = await promptEnsureFiles({
      cwd,
      primaryEnv: '.env',
      primaryExample: '.env.example',
      alreadyWarnedMissingEnv: false,
      isYesMode: true,
      isCiMode: false,
    });

    const examplePath = path.join(cwd, '.env.example');
    const content = fs.readFileSync(examplePath, 'utf-8');

    expect(content).toContain('FOO=');
    expect(content).toContain('BAZ=');
    expect(content).not.toContain('bar');
    expect(result.shouldExit).toBe(false);
  });
});

describe('toExampleContent', () => {
  it('keeps comments and blank lines and strips values', () => {
    expect(toExampleContent('# db\nFOO=bar\n\nBAZ=123\n')).toBe(
      '# db\nFOO=\n\nBAZ=\n',
    );
  });

  it('never copies the body of a multi-line quoted value', () => {
    const env = [
      'API=1',
      'PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----',
      'MIIEsecretBODYline',
      'abcd==',
      '-----END RSA PRIVATE KEY-----"',
      'AFTER=2',
    ].join('\n');

    expect(toExampleContent(env)).toBe('API=\nPRIVATE_KEY=\nAFTER=');
  });

  it('handles single quotes and a trailing comment after the closing quote', () => {
    const env = "CERT='line1\nline2' # cert\nNEXT=1";

    expect(toExampleContent(env)).toBe('CERT=\nNEXT=');
  });

  it('treats a value that opens and closes its quote on one line as complete', () => {
    expect(toExampleContent('A="x"\nB=\'y\' # c\nC=`z`\nD=1')).toBe(
      'A=\nB=\nC=\nD=',
    );
  });

  it('drops lines that are not KEY=value', () => {
    expect(toExampleContent('FOO=1\njust some text\n=nokey\nBAR=2')).toBe(
      'FOO=\nBAR=',
    );
  });

  it('handles CRLF line endings and a BOM', () => {
    expect(toExampleContent('\uFEFFFOO=1\r\nBAR=2\r\n')).toBe('FOO=\nBAR=\n');
  });
});
