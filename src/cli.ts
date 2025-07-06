#!/usr/bin/env node
import path from 'path';
import fs from 'fs';
import { parseEnvFile } from './lib/parseEnv.js';
import { diffEnv } from './lib/diffEnv.js';
import chalk from 'chalk';

const examplePath = path.resolve(process.cwd(), '.env.example');

if (!fs.existsSync(examplePath)) {
  console.error(chalk.red('❌ Error: .env.example file is missing in the project root.'));
  process.exit(1);
}

const envVariants = ['.env', '.env.local', '.env.production'];
const example = parseEnvFile(examplePath);

let hasErrors = false;

console.log(chalk.bold(`🔍 Comparing .env files to .env.example...`));

for (const filename of envVariants) {
  const envPath = path.resolve(process.cwd(), filename);

  if (!fs.existsSync(envPath)) {
    continue; // Skip non-existent files
  }

  const current = parseEnvFile(envPath);
  const diff = diffEnv(current, example);

  if (diff.missing.length === 0 && diff.extra.length === 0) {
    console.log(chalk.green(`✅ ${filename} matches .env.example`));
    continue;
  }

  hasErrors = true;

  if (diff.missing.length > 0) {
    console.log(chalk.red(`\n❌ ${filename} is missing keys:`));
    diff.missing.forEach((key) => console.log(chalk.red(`  - ${key}`)));
  }

  if (diff.extra.length > 0) {
    console.log(chalk.yellow(`\n⚠️  ${filename} has extra keys not in .env.example:`));
    diff.extra.forEach((key) => console.log(chalk.yellow(`  - ${key}`)));
  }
}

if (hasErrors) {
  process.exit(1);
}

console.log(chalk.green('\n🎉 All env files are valid.'));
process.exit(0);

