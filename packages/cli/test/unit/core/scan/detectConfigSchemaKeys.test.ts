import { describe, it, expect } from 'vitest';
import { detectConfigSchemaKeys } from '../../../../src/core/scan/detectConfigSchemaKeys.js';

describe('detectConfigSchemaKeys', () => {
  it('extracts schema keys from a Zod .parse(process.env) loader', () => {
    const content = `const envVars = z.object({
      CLIENT_ID_GITHUB: z.string(),
      CLIENT_SECRET_GITHUB: z.string().optional(),
    }).parse(process.env);`;

    expect(detectConfigSchemaKeys(content).sort()).toEqual([
      'CLIENT_ID_GITHUB',
      'CLIENT_SECRET_GITHUB',
    ]);
  });

  it('supports .safeParse(process.env)', () => {
    const content =
      'schema.safeParse(process.env);\nconst obj = { DATABASE_URL: 1 };';

    expect(detectConfigSchemaKeys(content)).toEqual(['DATABASE_URL']);
  });

  it('supports envalid cleanEnv(process.env, {...})', () => {
    const content =
      'const env = cleanEnv(process.env, { PORT: port(), API_KEY: str() });';

    expect(detectConfigSchemaKeys(content).sort()).toEqual(['API_KEY', 'PORT']);
  });

  it('supports direct whole-object assignment (= process.env)', () => {
    const content =
      'const env = process.env;\nconst cfg = { SECRET_TOKEN: env.SECRET_TOKEN };';

    expect(detectConfigSchemaKeys(content)).toEqual(['SECRET_TOKEN']);
  });

  it('supports spread of the whole env object ({ ...process.env })', () => {
    const content = 'const cfg = { ...process.env, EXTRA_FLAG: true };';

    expect(detectConfigSchemaKeys(content)).toEqual(['EXTRA_FLAG']);
  });

  it('recognises quoted keys', () => {
    const content =
      'z.object({ "CLIENT_SECRET_GITHUB": z.string() }).parse(process.env);';

    expect(detectConfigSchemaKeys(content)).toEqual(['CLIENT_SECRET_GITHUB']);
  });

  it('deduplicates repeated keys', () => {
    const content =
      'schema.parse(process.env);\nconst a = { API_KEY: 1 };\nconst b = { API_KEY: 2 };';

    expect(detectConfigSchemaKeys(content)).toEqual(['API_KEY']);
  });

  it('ignores non-UPPER_SNAKE keys', () => {
    const content =
      'z.object({ clientId: z.string(), someKey: z.string() }).parse(process.env);';

    expect(detectConfigSchemaKeys(content)).toEqual([]);
  });

  it('returns [] when the file only reads a single process.env.X key', () => {
    const content =
      'const key = process.env.API_KEY;\nconst obj = { OTHER_KEY: 1 };';

    // `process.env.API_KEY` must NOT count as whole-object consumption.
    expect(detectConfigSchemaKeys(content)).toEqual([]);
  });

  it('returns [] when the file does not touch process.env at all', () => {
    const content = 'const config = { DATABASE_URL: 1, API_KEY: 2 };';

    expect(detectConfigSchemaKeys(content)).toEqual([]);
  });

  it('returns [] for a whole-env loader with no UPPER_SNAKE object keys', () => {
    const content = 'const env = process.env;\nexport default env;';

    expect(detectConfigSchemaKeys(content)).toEqual([]);
  });

  it('detects the loader across newlines between .parse( and process.env', () => {
    const content =
      'const cfg = z\n  .object({ API_KEY: z.string() })\n  .parse(\n    process.env,\n  );';

    expect(detectConfigSchemaKeys(content)).toEqual(['API_KEY']);
  });

  it('extracts only object keys, not the accessor key, in a mixed file', () => {
    // The file both reads a single process.env.NODE_ENV and defines a schema.
    const content =
      'const runtime = process.env.NODE_ENV;\nconst cfg = schema.parse(process.env);\nconst obj = { DB_HOST: 1 };';

    // NODE_ENV is an accessor (no `KEY:`), so only the object key DB_HOST is declared.
    expect(detectConfigSchemaKeys(content)).toEqual(['DB_HOST']);
  });

  it('handles keys containing digits (e.g. OAUTH2_TOKEN, S3_BUCKET)', () => {
    const content =
      'cleanEnv(process.env, { OAUTH2_TOKEN: str(), S3_BUCKET: str() });';

    expect(detectConfigSchemaKeys(content).sort()).toEqual([
      'OAUTH2_TOKEN',
      'S3_BUCKET',
    ]);
  });
});
