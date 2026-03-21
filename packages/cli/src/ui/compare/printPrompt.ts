import path from 'path';
import {
  UI_LABEL_WIDTH,
  label,
  value,
  accent,
  warning,
  dim,
  divider,
  header,
} from '../theme.js';

/**
 * User interface messages for environment file operations.
 *
 * @description Provides formatted console output for various environment file
 * comparison and creation scenarios. All methods output styled messages using
 * theme tokens for enhanced readability.
 *
 * @property {Function} noEnvFound - Displays warning when no environment files are detected
 * @property {Function} missingEnv - Displays warning for a specific missing environment file
 * @property {Function} skipCreation - Notifies user that file creation was skipped
 * @property {Function} envCreated - Confirms successful creation of .env file from example
 * @property {Function} exampleCreated - Confirms successful creation of .env.example file from .env
 */
export const printPrompt = {
  noEnvFound() {
    console.log();
    console.log(`${warning('▸')} ${header('No env files found')}`);
    console.log(`${divider}`);
    console.log(
      `${label('Status'.padEnd(UI_LABEL_WIDTH))}${warning('no .env* or .env.example found')}`,
    );
    console.log(
      `${label('Action'.padEnd(UI_LABEL_WIDTH))}${dim('skipping comparison')}`,
    );
    console.log(`${divider}`);
  },

  missingEnv(envPath: string) {
    console.log();
    console.log(`${warning('▸')} ${header('File not found')}`);
    console.log(`${divider}`);
    console.log(
      `${label('File'.padEnd(UI_LABEL_WIDTH))}${warning(path.basename(envPath))}`,
    );
    console.log(`${divider}`);
  },

  skipCreation(fileType: string) {
    console.log();
    console.log(`${dim('▸')} ${header(`Skipping ${fileType} creation`)}`);
    console.log(`${divider}`);
    console.log(`${divider}`);
  },

  envCreated(envPath: string, examplePath: string) {
    console.log();
    console.log(`${accent('▸')} ${header('File created')}`);
    console.log(`${divider}`);
    console.log(
      `${label('Created'.padEnd(UI_LABEL_WIDTH))}${value(path.basename(envPath))}`,
    );
    console.log(
      `${label('From'.padEnd(UI_LABEL_WIDTH))}${dim(path.basename(examplePath))}`,
    );
    console.log(`${divider}`);
  },

  exampleCreated(examplePath: string, envPath: string) {
    console.log();
    console.log(`${accent('▸')} ${header('File created')}`);
    console.log(`${divider}`);
    console.log(
      `${label('Created'.padEnd(UI_LABEL_WIDTH))}${value(path.basename(examplePath))}`,
    );
    console.log(
      `${label('From'.padEnd(UI_LABEL_WIDTH))}${dim(path.basename(envPath))}`,
    );
    console.log(`${divider}`);
  },
};
