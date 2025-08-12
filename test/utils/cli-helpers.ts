import fs from 'fs';
import path from 'path';
import { execSync, spawnSync } from 'child_process';

let distDir: string | null = null;
let cliPath: string | null = null;

export function buildOnce() {
  if (distDir && cliPath) return { distDir, cliPath };
  distDir = fs.mkdtempSync(path.join(process.cwd(), 'dist-test-'));
  const tsc = path.join(process.cwd(), 'node_modules', '.bin', 'tsc');
  execSync(`${tsc} --outDir ${distDir}`, { stdio: 'inherit' });
  cliPath = path.join(distDir, 'bin', 'dotenv-diff.js');
  return { distDir, cliPath };
}

export function runCli(cwd: string, args: string[]) {
  if (!cliPath) buildOnce();
  return spawnSync('node', [cliPath!, ...args], { cwd, encoding: 'utf8' });
}

export function cleanupBuild() {
  if (distDir) {
    fs.rmSync(distDir, { recursive: true, force: true });
    distDir = null;
    cliPath = null;
  }
}
