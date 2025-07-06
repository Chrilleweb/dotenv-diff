#!/usr/bin/env node
import path from 'path';
import { parseEnvFile } from './lib/parseEnv.js';
import { diffEnv } from './lib/diffEnv.js';
import chalk from 'chalk';

const envPath = path.resolve(process.cwd(), '.env');
const examplePath = path.resolve(process.cwd(), '.env.example');

const current = parseEnvFile(envPath);
const example = parseEnvFile(examplePath);

const diff = diffEnv(current, example);

console.log(chalk.bold('🔍 Comparing .env and .env.example...'));

if (diff.missing.length === 0 && diff.extra.length === 0) {
  console.log(chalk.green('✅ All keys match! Your .env file is valid.'));
  process.exit(0);
}

if (diff.missing.length > 0) {
  console.log(chalk.red('\n❌ Missing keys in .env:'));
  diff.missing.forEach((key) => console.log(chalk.red(`  - ${key}`)));
}

if (diff.extra.length > 0) {
  console.log(chalk.yellow('\n⚠️  Extra keys in .env (not in .env.example):'));
  diff.extra.forEach((key) => console.log(chalk.yellow(`  - ${key}`)));
}

process.exit(1);
