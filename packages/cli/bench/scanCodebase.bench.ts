/**
 * Benchmarks for scanCodebase — verifies that parallel file processing
 * is faster than sequential I/O.
 *
 * Run with: pnpm vitest bench
 */

import { describe, expect, test, beforeAll, afterAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { createConcurrencyLimit } from '../src/core/helpers/concurrencyLimit.js';
import { isLikelyMinified } from '../src/core/helpers/isLikelyMinified.js';

// Vite's module runner turns imported bindings into getters, so calling them
// directly inside a benchmark measures the getter too. Bind them locally once.
// See https://vitest.dev/guide/benchmarking#stability
const _createConcurrencyLimit = createConcurrencyLimit;
const _isLikelyMinified = isLikelyMinified;

// --- Setup: generate temp files to scan ---
const FILE_COUNT = 200;
let tmpDir: string;
let files: string[];

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dotenv-diff-bench-'));
  files = await Promise.all(
    Array.from({ length: FILE_COUNT }, async (_, i) => {
      const filePath = path.join(tmpDir, `file-${i}.ts`);
      await fs.writeFile(
        filePath,
        `const x = process.env.API_KEY_${i};\nconst y = process.env.SECRET_${i};\n`,
      );
      return filePath;
    }),
  );
});

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

// --- Helpers (copied logic, no side effects) ---
async function safeReadFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

async function processFile(filePath: string) {
  const content = await safeReadFile(filePath);
  if (!content || _isLikelyMinified(content)) return null;
  return content;
}

// --- Benchmarks ---
describe('scanCodebase: sequential vs parallel', () => {
  test('sequential I/O vs bounded parallelism', async ({ bench }) => {
    // `sink` consumes the file contents so the reads cannot be dropped as
    // dead code — see https://vitest.dev/guide/benchmarking#stability
    let sink = 0;

    const result = await bench.compare(
      bench('sequential (old)', async () => {
        for (const filePath of files) {
          sink += (await processFile(filePath))?.length ?? 0;
        }
      }),
      bench('parallel with concurrency limit (new)', async () => {
        const limit = _createConcurrencyLimit(50);
        const contents = await Promise.all(
          files.map((f) => limit(() => processFile(f))),
        );
        for (const c of contents) sink += c?.length ?? 0;
      }),
    );

    if (Number.isNaN(sink)) throw new Error('unreachable');

    expect(result.get('parallel with concurrency limit (new)')).toBeFasterThan(
      result.get('sequential (old)'),
    );
  });
});
