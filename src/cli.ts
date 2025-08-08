#!/usr/bin/env node

/**
 * CLI entry point for the `dotenv-diff` tool.
 *
 * - Compares `.env` and `.env.example` files.
 * - Optionally checks for value mismatches.
 * - Warns about missing keys, extra keys, empty values, and mismatches.
 */

import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import prompts from 'prompts';
import { parseEnvFile } from './lib/parseEnv.js';
import { diffEnv } from './lib/diffEnv.js';
import { warnIfEnvNotIgnored } from './lib/checkGitignore.js';

const program = new Command();

program
  .name('dotenv-diff')
  .description('Compare .env and .env.example files')
  .option('--check-values', 'Compare actual values if example has values')
  .parse(process.argv);

const options = program.opts();
const checkValues = options.checkValues ?? false;

const cwd = process.cwd();
const envPath = path.resolve(cwd, '.env');
const examplePath = path.resolve(cwd, '.env.example');

const envExists = fs.existsSync(envPath);
const exampleExists = fs.existsSync(examplePath);

// Case 1: Neither file exists
if (!envExists && !exampleExists) {
  console.log(chalk.yellow('⚠️  No .env or .env.example file found. Skipping comparison.'));
  process.exit(0);
}

// Case 2: .env is missing but .env.example exists
if (!envExists && exampleExists) {
  console.log(chalk.yellow('📄 .env file not found.'));

  const response = await prompts({
    type: 'select',
    name: 'createEnv',
    message: '❓ Do you want to create a new .env file from .env.example?',
    choices: [
      { title: 'Yes', value: true },
      { title: 'No', value: false }
    ],
    initial: 0
  });

  if (!response.createEnv) {
    console.log(chalk.gray('🚫 Skipping .env creation.'));
    process.exit(0);
  }

  const exampleContent = fs.readFileSync(examplePath, 'utf-8');
  fs.writeFileSync(envPath, exampleContent);

  console.log(chalk.green('✅ .env file created successfully from .env.example.\n'));
  warnIfEnvNotIgnored();
}

// Case 3: .env exists, but .env.example is missing
if (envExists && !exampleExists) {
  console.log(chalk.yellow('📄 .env.example file not found.'));

  const response = await prompts({
    type: 'select',
    name: 'createExample',
    message: '❓ Do you want to create a new .env.example file from .env?',
    choices: [
      { title: 'Yes', value: true },
      { title: 'No', value: false }
    ],
    initial: 0
  });

  if (!response.createExample) {
    console.log(chalk.gray('🚫 Skipping .env.example creation.'));
    process.exit(0);
  }

  const envContent = fs.readFileSync(envPath, 'utf-8')
  .split('\n')
  .map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return trimmed;
    const [key] = trimmed.split('=');
    return `${key}=`;
  })
  .join('\n');

fs.writeFileSync(examplePath, envContent);


  console.log(chalk.green('✅ .env.example file created successfully from .env.\n'));
}

// Case 4: Run comparison
if (!fs.existsSync(envPath) || !fs.existsSync(examplePath)) {
  console.error(chalk.red('❌ Error: .env or .env.example is missing after setup.'));
  process.exit(1);
}

// Case 5: Both files exist, proceed with comparison
warnIfEnvNotIgnored();
console.log(chalk.bold('🔍 Comparing .env and .env.example...\n'));

const current = parseEnvFile(envPath);
const example = parseEnvFile(examplePath);
const diff = diffEnv(current, example, checkValues);

const emptyKeys = Object.entries(current)
  .filter(([, value]) => value.trim() === '')
  .map(([key]) => key);

if (
  diff.missing.length === 0 &&
  diff.extra.length === 0 &&
  emptyKeys.length === 0 &&
  diff.valueMismatches.length === 0
) {
  console.log(chalk.green('✅ All keys match! Your .env file is valid.'));
  process.exit(0);
}

if (diff.missing.length > 0) {
  console.log(chalk.red('\n❌ Missing keys in .env:'));
  diff.missing.forEach((key) => console.log(chalk.red(`  - ${key}`)));
}

if (diff.extra.length > 0) {
  console.log(chalk.yellow('\n⚠️  Extra keys in .env (not defined in .env.example):'));
  diff.extra.forEach((key) => console.log(chalk.yellow(`  - ${key}`)));
}

if (emptyKeys.length > 0) {
  console.log(chalk.yellow('\n⚠️  The following keys in .env have no value (empty):'));
  emptyKeys.forEach((key) => console.log(chalk.yellow(`  - ${key}`)));
}

if (checkValues && diff.valueMismatches.length > 0) {
  console.log(chalk.yellow('\n⚠️  The following keys have different values:'));
  diff.valueMismatches.forEach(({ key, expected, actual }) => {
    console.log(chalk.yellow(`  - ${key}: expected '${expected}', but got '${actual}'`));
  });
}

process.exit(diff.missing.length > 0 ? 1 : 0);
