import fs from 'fs';
import os from 'os';
import path from 'path';

export function makeTmpDir(prefix = 'dotenv-diff-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function touch(filePath: string, content = '') {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

export function rmrf(p: string) {
  fs.rmSync(p, { recursive: true, force: true });
}
