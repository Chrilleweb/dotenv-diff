import { describe, it, expect } from 'vitest';
import { diffEnv, parseEnvFile, parseEnvContent } from '../../src/index.js';
import { diffEnv as diffEnvDirect } from '../../src/core/diffEnv.js';
import { parseEnvFile as parseEnvFileDirect } from '../../src/services/parseEnvFile.js';
import { parseEnvContent as parseEnvContentDirect } from '../../src/core/parseEnv.js';

describe('index exports', () => {
  it('re-exports parseEnvFile from services/parseEnvFile', () => {
    expect(parseEnvFile).toBe(parseEnvFileDirect);
  });

  it('re-exports parseEnvContent from core/parseEnv', () => {
    expect(parseEnvContent).toBe(parseEnvContentDirect);
  });

  it('re-exports diffEnv from core/diffEnv', () => {
    expect(diffEnv).toBe(diffEnvDirect);
  });
});
