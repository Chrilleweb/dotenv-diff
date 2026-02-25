import { describe, it, expect } from 'vitest';
import { diffEnv, parseEnvFile } from '../../src/index.js';
import { diffEnv as diffEnvDirect } from '../../src/core/diffEnv.js';
import { parseEnvFile as parseEnvFileDirect } from '../../src/core/parseEnv.js';

describe('index exports', () => {
  it('re-exports parseEnvFile from core/parseEnv', () => {
    expect(parseEnvFile).toBe(parseEnvFileDirect);
  });

  it('re-exports diffEnv from core/diffEnv', () => {
    expect(diffEnv).toBe(diffEnvDirect);
  });
});
