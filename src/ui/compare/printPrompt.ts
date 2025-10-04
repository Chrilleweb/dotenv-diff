import chalk from 'chalk';
import path from 'path';

/**
 * Prompt messages for user interactions.
 */
export const printPrompt = {
  noEnvFound() {
    console.log(
      chalk.yellow('⚠️  No .env* or .env.example file found. Skipping comparison.'),
    );
  },

  missingEnv(envPath: string) {
    console.log();
    console.log(chalk.yellow(`📄 ${path.basename(envPath)} file not found.`));
  },

  skipCreation(fileType: string) {
    console.log(chalk.gray(`🚫 Skipping ${fileType} creation.`));
  },

  envCreated(envPath: string, examplePath: string) {
    console.log(
      chalk.green(
        `✅ ${path.basename(envPath)} file created successfully from ${path.basename(examplePath)}.`,
      ),
    );
  },

  exampleCreated(examplePath: string, envPath: string) {
    console.log(
      chalk.green(
        `✅ ${path.basename(examplePath)} file created successfully from ${path.basename(envPath)}.`,
      ),
    );
  },
};
