#!/usr/bin/env node

/**
 * CLI entry point for the `dotenv-diff` tool.
 *
 * - Compares `.env` and `.env.example` files.
 * - Optionally checks for value mismatches.
 * - Warns about missing keys, extra keys, empty values, and mismatches.
 *
 * Usage:
 * ```bash
 * dotenv-diff
 * dotenv-diff --check-values
 * ```
 *
 * Exit codes:
 * - 0: All keys match or only warnings.
 * - 1: Missing keys found.
 */
import { Command } from 'commander';
import path from "path";
import fs from "fs";
import chalk from "chalk";
import readline from "readline";
import { parseEnvFile } from "./lib/parseEnv.js";
import { diffEnv } from "./lib/diffEnv.js";

const program = new Command();

/**
 * Prompts the user with a yes/no question
 * @param question The question to ask the user
 * @returns Promise<boolean> true if user answers yes, false otherwise
 */
async function promptUser(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${question} (y/N): `, (answer) => {
      rl.close();
      const normalizedAnswer = answer.trim().toLowerCase();
      resolve(normalizedAnswer === 'y' || normalizedAnswer === 'yes');
    });
  });
}

/**
 * Copies the content from source file to destination file, preserving formatting
 * @param source Source file path
 * @param destination Destination file path
 */
function copyFile(source: string, destination: string): void {
  const content = fs.readFileSync(source, 'utf-8');
  fs.writeFileSync(destination, content, 'utf-8');
}

program
  .name('dotenv-diff')
  .description('Compare .env and .env.example files')
  .option('--check-values', 'Compare actual values if example has values')
  .parse(process.argv);

const options = program.opts();
const checkValues = options.checkValues ?? false;

async function main() {
  // Check file existence and handle missing .env file
  const envPath = path.resolve(process.cwd(), ".env");
  const examplePath = path.resolve(process.cwd(), ".env.example");

  if (!fs.existsSync(envPath)) {
    if (!fs.existsSync(examplePath)) {
      // Neither file exists
      console.log(chalk.yellow("⚠️ No .env or .env.example file found. Skipping comparison."));
      process.exit(0);
    }
    
    // .env missing but .env.example exists - prompt to create
    console.log(chalk.blue("📄 .env file not found."));
    const currentDir = path.basename(process.cwd());
    const shouldCreate = await promptUser(
      chalk.blue(`❓ Do you want to create a new .env file from .env.example in your ${currentDir} folder?`)
    );
    
    if (shouldCreate) {
      try {
        copyFile(examplePath, envPath);
        console.log(chalk.green("✅ .env file created successfully."));
      } catch (error) {
        console.error(chalk.red(`❌ Error creating .env file: ${error}`));
        process.exit(1);
      }
    } else {
      console.log(chalk.yellow("🚫 .env file creation cancelled."));
      process.exit(0);
    }
  }

  if (!fs.existsSync(examplePath)) {
    console.error(chalk.red("❌ Error: .env.example file is missing in the project root."));
    process.exit(1);
  }

  console.log(chalk.bold("🔍 Comparing .env and .env.example..."));

  const current = parseEnvFile(envPath);
  const example = parseEnvFile(examplePath);

  const diff = diffEnv(current, example, checkValues);

  // Find tomme variabler i .env
  const emptyKeys = Object.entries(current)
    .filter(([key, value]) => value.trim() === "")
    .map(([key]) => key);

  let hasWarnings = false;

  if (
    diff.missing.length === 0 &&
    diff.extra.length === 0 &&
    emptyKeys.length === 0 &&
    diff.valueMismatches.length === 0
  ) {
    console.log(chalk.green("✅ All keys match! Your .env file is valid."));
    process.exit(0);
  }

  if (diff.missing.length > 0) {
    console.log(chalk.red("\n❌ Missing keys in .env:"));
    diff.missing.forEach((key) => console.log(chalk.red(`  - ${key}`)));
  }

  if (diff.extra.length > 0) {
    console.log(chalk.yellow("\n⚠️  Extra keys in .env (not defined in .env.example):"));
    diff.extra.forEach((key) => console.log(chalk.yellow(`  - ${key}`)));
  }

  if (emptyKeys.length > 0) {
    hasWarnings = true;
    console.log(chalk.yellow("\n⚠️  The following keys in .env have no value (empty):"));
    emptyKeys.forEach((key) => console.log(chalk.yellow(`  - ${key}`)));
  }

  if (checkValues && diff.valueMismatches.length > 0) {
    hasWarnings = true;
    console.log(chalk.yellow("\n⚠️  The following keys have different values:"));
    diff.valueMismatches.forEach(({ key, expected, actual }) => {
      console.log(chalk.yellow(`  - ${key}: expected "${expected}", but got "${actual}"`));
    });
  }

  process.exit(diff.missing.length > 0 ? 1 : hasWarnings ? 0 : 0);
}

// Run the main function
main().catch((error) => {
  console.error(chalk.red(`❌ Unexpected error: ${error}`));
  process.exit(1);
});
