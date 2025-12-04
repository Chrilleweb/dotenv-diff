import fs from 'fs';
import path from 'path';
import {
  printInitSuccess,
  printInitExists,
} from '../ui/shared/printInitStatus.js';

/**
 * Creates a default dotenv-diff.config.json in the current directory if it doesn't exist.
 * If the file already exists, it notifies the user and does nothing.
 * @returns void
 */
export async function runInit(): Promise<void> {
  const configPath = path.resolve('dotenv-diff.config.json');

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

  try {
    await fs.promises.writeFile(
      configPath,
      JSON.stringify(defaultConfig, null, 2),
      'utf8',
    );

    printInitSuccess(configPath);
  } catch (err) {
    console.error('Failed to create dotenv-diff.config.json:', err);
  }
}
