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
  .option('--ci', 'Run non-interactively and never create files')
  .option('-y, --yes', 'Run non-interactively and answer Yes to prompts')
  .parse(process.argv);

const options = program.opts();
const checkValues = options.checkValues ?? false;
const isCiMode = Boolean(options.ci);
const isYesMode = Boolean(options.yes);
if (isCiMode && isYesMode) {
  console.log(
    chalk.yellow('⚠️  Both --ci and --yes provided; proceeding with --yes.'),
  );
}

const cwd = process.cwd();
const envFiles = fs
  .readdirSync(cwd)
  .filter((f) => f.startsWith('.env') && !f.startsWith('.env.example'))
  .sort((a, b) => (a === '.env' ? -1 : b === '.env' ? 1 : a.localeCompare(b)));


// Brug første .env* fil som "main" hvis flere findes
// (resten håndteres senere i et loop)
const primaryEnv = envFiles.includes('.env') ? '.env' : envFiles[0] || '.env';
const primaryExample = '.env.example';
const envPath = path.resolve(cwd, primaryEnv);
const examplePath = path.resolve(cwd, primaryExample);

const envExists = fs.existsSync(envPath);
const exampleExists = fs.existsSync(examplePath);

// Case 1: No env files and no .env.example → nothing to do
if (envFiles.length === 0 && !exampleExists) {
  console.log(
    chalk.yellow(
      '⚠️  No .env* or .env.example file found. Skipping comparison.',
    ),
  );
  process.exit(0);
}

// Case 2: .env is missing but .env.example exists
if (!envExists && exampleExists) {
  console.log(chalk.yellow('📄 .env file not found.'));
  let createEnv = false;
  if (isYesMode) {
    createEnv = true;
  } else if (isCiMode) {
    console.log(chalk.gray('🚫 Skipping .env creation (CI mode).'));
    process.exit(1);
  } else {
    const response = await prompts({
      type: 'select',
      name: 'createEnv',
      message: '❓ Do you want to create a new .env file from .env.example?',
      choices: [
        { title: 'Yes', value: true },
        { title: 'No', value: false },
      ],
      initial: 0,
    });
    createEnv = Boolean(response.createEnv);
  }

  if (!createEnv) {
    console.log(chalk.gray('🚫 Skipping .env creation.'));
    process.exit(0);
  }

  const exampleContent = fs.readFileSync(examplePath, 'utf-8');
  fs.writeFileSync(envPath, exampleContent);

  console.log(
    chalk.green('✅ .env file created successfully from .env.example.\n'),
  );
  warnIfEnvNotIgnored();
}

// Case 3: .env exists, but .env.example is missing
if (envExists && !exampleExists) {
  console.log(chalk.yellow('📄 .env.example file not found.'));
  let createExample = false;
  if (isYesMode) {
    createExample = true;
  } else if (isCiMode) {
    console.log(chalk.gray('🚫 Skipping .env.example creation (CI mode).'));
    process.exit(1);
  } else {
    const response = await prompts({
      type: 'select',
      name: 'createExample',
      message: '❓ Do you want to create a new .env.example file from .env?',
      choices: [
        { title: 'Yes', value: true },
        { title: 'No', value: false },
      ],
      initial: 0,
    });
    createExample = Boolean(response.createExample);
  }

  if (!createExample) {
    console.log(chalk.gray('🚫 Skipping .env.example creation.'));
    process.exit(0);
  }

  const envContent = fs
    .readFileSync(envPath, 'utf-8')
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return trimmed;
      const [key] = trimmed.split('=');
      return `${key}=`;
    })
    .join('\n');

  fs.writeFileSync(examplePath, envContent);

  console.log(
    chalk.green('✅ .env.example file created successfully from .env.\n'),
  );
}

// Case 4: Run comparison
if (!fs.existsSync(envPath) || !fs.existsSync(examplePath)) {
  console.error(
    chalk.red('❌ Error: .env or .env.example is missing after setup.'),
  );
  process.exit(1);
}
// Case 5: Compare all found .env* files
let exitWithError = false;

for (const envName of envFiles.length > 0 ? envFiles : [primaryEnv]) {
  const suffix = envName === '.env' ? '' : envName.replace('.env', '');
  const exampleName = suffix ? `.env.example${suffix}` : primaryExample;

  const envPathCurrent = path.resolve(cwd, envName);
  const examplePathCurrent = fs.existsSync(path.resolve(cwd, exampleName))
    ? path.resolve(cwd, exampleName)
    : examplePath;

  if (!fs.existsSync(envPathCurrent) || !fs.existsSync(examplePathCurrent)) {
  console.log(chalk.bold(`🔍 Comparing ${envName} ↔ ${path.basename(examplePathCurrent)}...`));
  console.log(chalk.yellow('  ⚠️  Skipping: missing matching example file.'));
  console.log();
  continue;
}

console.log(chalk.bold(`🔍 Comparing ${envName} ↔ ${path.basename(examplePathCurrent)}...`));

warnIfEnvNotIgnored({
  cwd,
  envFile: envName,
  log: (msg) => console.log(msg.replace(/^/gm, '  ')),
});


  const current = parseEnvFile(envPathCurrent);
  const example = parseEnvFile(examplePathCurrent);
  const diff = diffEnv(current, example, checkValues);

  const emptyKeys = Object.entries(current)
    .filter(([, value]) => (value ?? '').trim() === '')
    .map(([key]) => key);

  if (
    diff.missing.length === 0 &&
    diff.extra.length === 0 &&
    emptyKeys.length === 0 &&
    diff.valueMismatches.length === 0
  ) {
    console.log(chalk.green('  ✅ All keys match.'));
    console.log();
    continue;
  }

  if (diff.missing.length > 0) {
    exitWithError = true;
    console.log(chalk.red('  ❌ Missing keys:'));
    diff.missing.forEach((key) => console.log(chalk.red(`      - ${key}`)));
  }

  if (diff.extra.length > 0) {
    console.log(chalk.yellow('  ⚠️  Extra keys (not in example):'));
    diff.extra.forEach((key) => console.log(chalk.yellow(`      - ${key}`)));
  }

  if (emptyKeys.length > 0) {
    console.log(chalk.yellow('  ⚠️  Empty values:'));
    emptyKeys.forEach((key) => console.log(chalk.yellow(`      - ${key}`)));
  }

  if (checkValues && diff.valueMismatches.length > 0) {
    console.log(chalk.yellow('  ⚠️  Value mismatches:'));
diff.valueMismatches.forEach(({ key, expected, actual }) => {
  console.log(chalk.yellow(`      - ${key}: expected '${expected}', but got '${actual}'`));
});

  }
  console.log(); // blank line efter sektionen med findings
}

process.exit(exitWithError ? 1 : 0);
