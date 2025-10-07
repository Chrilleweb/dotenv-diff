import fs from 'fs';
import path from 'path';
import { printInitSuccess, printInitExists } from '../ui/shared/printInitStatus.js';

/**
 * Creates a default dotenv-diff.config.json in the current directory if it doesn't exist.
  * If the file already exists, it notifies the user and does nothing.
 */
export async function runInit() {
  const cwd = process.cwd();
  const configPath = path.join(cwd, 'dotenv-diff.config.json');

  if (fs.existsSync(configPath)) {
    printInitExists(configPath);
    return;
  }

  const defaultConfig = {
    strict: false,
    example: '.env.example',
    ignore: ['NODE_ENV', 'VITE_MODE'],
    ignoreUrls: ['https://example.com'],
  };

  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  printInitSuccess(configPath);
}
