import fs from 'fs';
import path from 'path';
import { execSync, spawnSync } from 'child_process';

let distDir: string | null = null;
let cliPath: string | null = null;

/**
 * Builds the project and returns the output directory and CLI path.
 * - If already built (distDir and cliPath are set), return them.
 * - Otherwise, create a temporary directory for the build output.
 * - Run the TypeScript compiler (tsc) to compile the project into the temporary directory.
 * - Set the cliPath to point to the compiled CLI script within the build output directory.
 * @returns The build output directory and CLI path.
 */
export function buildOnce(): { distDir: string; cliPath: string } {
  if (distDir && cliPath) return { distDir, cliPath };
  distDir = fs.mkdtempSync(path.join(process.cwd(), 'dist-test-'));
  const tsc = path.join(process.cwd(), 'node_modules', '.bin', 'tsc');
  execSync(`${tsc} --outDir ${distDir}`, { stdio: 'inherit' });
  cliPath = path.join(distDir, 'bin', 'dotenv-diff.js');
  return { distDir, cliPath };
}

/**
 * Runs the CLI with the given arguments in the specified working directory.
 * @params cwd - The current working directory to run the CLI in.
 * @params args - The arguments to pass to the CLI.
 * @returns The result of the CLI execution.
 */
export function runCli(cwd: string, args: string[]) {
  if (!cliPath) buildOnce();
  return spawnSync('node', [cliPath!, ...args], { cwd, encoding: 'utf8' });
}

/**
 * Cleans up the build output directory.
 * - If the distDir is set, remove it and all its contents.
 * - Reset distDir and cliPath to null.
 * @returns void
 */
export function cleanupBuild(): void {
  if (distDir) {
    fs.rmSync(distDir, { recursive: true, force: true });
    distDir = null;
    cliPath = null;
  }
}
