import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { detectEnvExpirations } from '../../../src/services/detectEnvExpirations.js';

describe('detectEnvExpirations', () => {
  let tmpDir: string;
  let envPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'expire-test-'));
    envPath = path.join(tmpDir, '.env');

    // Freeze time for deterministic tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-12-01'));
  });

  afterEach(() => {
    vi.useRealTimers();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('detects expiration for the next env variable', () => {
    fs.writeFileSync(
      envPath,
      `
      # @expire 2024-12-31
      API_KEY=123
      `,
    );

    const result = detectEnvExpirations(envPath);

    expect(result).toEqual([
      {
        key: 'API_KEY',
        date: '2024-12-31',
        daysLeft: 30,
      },
    ]);
  });

  it('supports expire comment without @ symbol', () => {
    fs.writeFileSync(
      envPath,
      `
      # expire 2024-12-10
      TOKEN=abc
      `,
    );

    const result = detectEnvExpirations(envPath);

    expect(result[0].key).toBe('TOKEN');
    expect(result[0].daysLeft).toBe(9);
  });

  it('supports // expire comments', () => {
    fs.writeFileSync(
      envPath,
      `
      // @expire 2024-12-05
      SECRET=value
      `,
    );

    const result = detectEnvExpirations(envPath);

    expect(result).toEqual([
      {
        key: 'SECRET',
        date: '2024-12-05',
        daysLeft: 4,
      },
    ]);
  });

  it('ignores expire comment if no env key follows', () => {
    fs.writeFileSync(
      envPath,
      `
      # @expire 2024-12-31
      `,
    );

    const result = detectEnvExpirations(envPath);

    expect(result).toEqual([]);
  });

  it('applies expiration only to the first env key after the comment', () => {
    fs.writeFileSync(
      envPath,
      `
      # @expire 2024-12-31
      A=1
      B=2
      `,
    );

    const result = detectEnvExpirations(envPath);

    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('A');
  });

  it('handles multiple expiration blocks', () => {
    fs.writeFileSync(
      envPath,
      `
      # @expire 2024-12-10
      A=1

      # @expire 2024-12-20
      B=2
      `,
    );

    const result = detectEnvExpirations(envPath);

    expect(result).toEqual([
      { key: 'A', date: '2024-12-10', daysLeft: 9 },
      { key: 'B', date: '2024-12-20', daysLeft: 19 },
    ]);
  });
});
