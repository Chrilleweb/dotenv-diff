#!/usr/bin/env node
import path from 'path';
import fs from 'fs';
import { parseEnvFile } from './lib/parseEnv.js';
import { diffEnv } from './lib/diffEnv.js';
import chalk from 'chalk';

const envPath = path.resolve(process.cwd(), '.env');
const examplePath = path.resolve(process.cwd(), '.env.example');

if (!fs.existsSync(envPath)) {
  console.error(chalk.red('❌ Error: .env file is missing in the project root.'));
  process.exit(1);
}

if (!fs.existsSync(examplePath)) {
  console.error(chalk.red('❌ Error: .env.example file is missing in the project root.'));
  process.exit(1);
}

console.log(chalk.bold('🔍 Comparing .env and .env.example...'));

const current = parseEnvFile(envPath);
const example = parseEnvFile(examplePath);

const diff = diffEnv(current, example);

if (diff.missing.length === 0 && diff.extra.length === 0) {
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

process.exit(1);
