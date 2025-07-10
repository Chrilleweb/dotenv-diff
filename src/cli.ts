#!/usr/bin/env node
import { Command } from 'commander';
import path from "path";
import fs from "fs";
import chalk from "chalk";
import { parseEnvFile } from "./lib/parseEnv.js";
import { diffEnv } from "./lib/diffEnv.js";

const program = new Command();

program
  .name('dotenv-diff')
  .description('Compare .env and .env.example files')
  .option('--check-values', 'Compare actual values if example has values')
  .parse(process.argv);

const options = program.opts();
const checkValues = options.checkValues ?? false;

// Her kører din eksisterende diff-logik videre:
const envPath = path.resolve(process.cwd(), ".env");
const examplePath = path.resolve(process.cwd(), ".env.example");

if (!fs.existsSync(envPath)) {
  console.error(chalk.red("❌ Error: .env file is missing in the project root."));
  process.exit(1);
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
