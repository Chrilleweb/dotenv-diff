import chalk from 'chalk';
import path from 'path';

/**
 * User interface messages for environment file operations.
 *
 * @description Provides formatted console output for various environment file
 * comparison and creation scenarios. All methods output styled messages using
 * chalk for enhanced readability.
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
    console.log(
      chalk.yellow(
        '⚠️  No .env* or .env.example file found. Skipping comparison.',
      ),
    );
  },

  missingEnv(envPath: string) {
    console.log();
    console.log(chalk.yellow(`📄 ${path.basename(envPath)} file not found.`));
  },

  skipCreation(fileType: string) {
    console.log();
    console.log(chalk.gray(`🚫 Skipping ${fileType} creation.`));
  },

  envCreated(envPath: string, examplePath: string) {
    console.log();
    console.log(
      chalk.green(
        `✅ ${path.basename(envPath)} file created successfully from ${path.basename(examplePath)}.`,
      ),
    );
  },

  exampleCreated(examplePath: string, envPath: string) {
    console.log();
    console.log(
      chalk.green(
        `✅ ${path.basename(examplePath)} file created successfully from ${path.basename(envPath)}.`,
      ),
    );
  },
};
