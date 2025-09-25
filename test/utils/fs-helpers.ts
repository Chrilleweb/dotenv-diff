import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * Creates a temporary directory.
 * @param prefix - The prefix for the temporary directory name.
 * @returns The path to the created temporary directory.
 */
export function makeTmpDir(prefix = 'dotenv-diff-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/**
 * Touches a file (creates it if it doesn't exist).
 * @param filePath - The path to the file to touch.
 * @param content - The content to write to the file.
 * @returns void
 */
export function touch(filePath: string, content = '') {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

/**
 * Removes a directory and all its contents.
 * @param p - The path to remove.
 * @return void
 */
export function rmrf(p: string) {
  fs.rmSync(p, { recursive: true, force: true });
}
