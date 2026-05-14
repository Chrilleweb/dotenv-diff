/**
 * Benchmarks for scanCodebase — verifies that parallel file processing
 * is faster than sequential I/O.
 *
 * Run with: pnpm vitest bench
 */

import { bench, describe, beforeAll, afterAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { createConcurrencyLimit } from '../src/core/helpers/concurrencyLimit.js';
import { isLikelyMinified } from '../src/core/helpers/isLikelyMinified.js';

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
  if (!content || isLikelyMinified(content)) return null;
  return content;
}

// --- Benchmarks ---
describe('scanCodebase: sequential vs parallel', () => {
  bench('sequential (old)', async () => {
    for (const filePath of files) {
      await processFile(filePath);
    }
  });

  bench('parallel with concurrency limit (new)', async () => {
    const limit = createConcurrencyLimit(50);
    await Promise.all(files.map((f) => limit(() => processFile(f))));
  });
});
