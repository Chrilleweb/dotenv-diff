import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import prompts from 'prompts';
import { parseEnvFile } from '../lib/parseEnv.js';
import { diffEnv } from '../lib/diffEnv.js';
import { warnIfEnvNotIgnored } from '../services/git.js';
import type { Command } from 'commander';

export async function run(program: Command) {
  program.parse(process.argv);

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
  const envFlag = options.env ? path.resolve(cwd, options.env) : null;
  const exampleFlag = options.example ? path.resolve(cwd, options.example) : null;
  const bothFlags = Boolean(envFlag && exampleFlag);
  let alreadyWarnedMissingEnv = false;

  if (bothFlags) {
    const envExistsFlag = fs.existsSync(envFlag!);
    const exampleExistsFlag = fs.existsSync(exampleFlag!);

    if (!envExistsFlag || !exampleExistsFlag) {
      if (!envExistsFlag) {
        console.error(
          chalk.red(`❌ Error: --env file not found: ${path.basename(envFlag!)}`),
        );
      }
      if (!exampleExistsFlag) {
        console.error(
          chalk.red(
            `❌ Error: --example file not found: ${path.basename(exampleFlag!)}`,
          ),
        );
      }
      process.exit(1);
    }

    console.log(
      chalk.bold(
        `🔍 Comparing ${path.basename(envFlag!)} ↔ ${path.basename(exampleFlag!)}...`,
      ),
    );

    const current = parseEnvFile(envFlag!);
    const example = parseEnvFile(exampleFlag!);
    const diff = diffEnv(current, example, checkValues);

    const emptyKeys = Object.entries(current)
      .filter(([, value]) => (value ?? '').trim() === '')
      .map(([key]) => key);

    let exitWithError = false;

    if (
      diff.missing.length === 0 &&
      diff.extra.length === 0 &&
      emptyKeys.length === 0 &&
      diff.valueMismatches.length === 0
    ) {
      console.log(chalk.green('  ✅ All keys match.'));
      console.log();
      process.exit(0);
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
        console.log(
          chalk.yellow(`      - ${key}: expected '${expected}', but got '${actual}'`),
        );
      });
    }

    console.log();
    process.exit(exitWithError ? 1 : 0);
  }

  const envFiles = fs
    .readdirSync(cwd)
    .filter((f) => f.startsWith('.env') && !f.startsWith('.env.example'))
    .sort((a, b) => (a === '.env' ? -1 : b === '.env' ? 1 : a.localeCompare(b)));

  let primaryEnv = envFiles.includes('.env') ? '.env' : envFiles[0] || '.env';
  let primaryExample = '.env.example';

  if (envFlag && !exampleFlag) {
    const envNameFromFlag = path.basename(envFlag);
    primaryEnv = envNameFromFlag;
    const exists = fs.existsSync(envFlag);
    if (exists) {
      const set = new Set([envNameFromFlag, ...envFiles]);
      envFiles.length = 0;
      envFiles.push(...[...set]);
    }
    const suffix = envNameFromFlag === '.env' ? '' : envNameFromFlag.replace('.env', '');
    const potentialExample = suffix ? `.env.example${suffix}` : '.env.example';
    if (fs.existsSync(path.resolve(cwd, potentialExample))) {
      primaryExample = potentialExample;
    }
  }

  if (exampleFlag && !envFlag) {
    const exampleNameFromFlag = path.basename(exampleFlag);
    primaryExample = exampleNameFromFlag;
    if (exampleNameFromFlag.startsWith('.env.example')) {
      const suffix = exampleNameFromFlag.slice('.env.example'.length);
      const matchedEnv = suffix ? `.env${suffix}` : '.env';
      if (fs.existsSync(path.resolve(cwd, matchedEnv))) {
        primaryEnv = matchedEnv;
        envFiles.length = 0;
        envFiles.push(matchedEnv);
      } else {
        alreadyWarnedMissingEnv = true;
      }
    } else {
      if (envFiles.length === 0) envFiles.push(primaryEnv);
    }
  }

  const envPath = path.resolve(cwd, primaryEnv);
  const examplePath = path.resolve(cwd, primaryExample);

  const envExists = fs.existsSync(envPath);
  const exampleExists = fs.existsSync(examplePath);

  if (envFiles.length === 0 && !exampleExists) {
    console.log(
      chalk.yellow(
        '⚠️  No .env* or .env.example file found. Skipping comparison.',
      ),
    );
    process.exit(0);
  }

  if (!envExists && exampleExists) {
    if (!alreadyWarnedMissingEnv) {
      console.log(chalk.yellow(`📄 ${path.basename(envPath)} file not found.`));
    }
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
        message: `❓ Do you want to create a new ${path.basename(envPath)} file from ${path.basename(examplePath)}?`,
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
      chalk.green(
        `✅ ${path.basename(envPath)} file created successfully from ${path.basename(examplePath)}.\n`,
      ),
    );
    warnIfEnvNotIgnored({ envFile: path.basename(envPath) });
  }

  if (envExists && !exampleExists) {
    console.log(
      chalk.yellow(`📄 ${path.basename(examplePath)} file not found.`),
    );
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
        message: `❓ Do you want to create a new ${path.basename(examplePath)} file from ${path.basename(envPath)}?`,
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
      chalk.green(
        `✅ ${path.basename(examplePath)} file created successfully from ${path.basename(envPath)}.\n`,
      ),
    );
  }

  if (!fs.existsSync(envPath) || !fs.existsSync(examplePath)) {
    console.error(
      chalk.red('❌ Error: .env or .env.example is missing after setup.'),
    );
    process.exit(1);
  }
  let exitWithError = false;

  for (const envName of envFiles.length > 0 ? envFiles : [primaryEnv]) {
    if (exampleFlag && !envFlag) {
      const envAbs = path.resolve(cwd, envName);
      if (envAbs === examplePath) {
        continue;
      }
    }

    const suffix = envName === '.env' ? '' : envName.replace('.env', '');
    const exampleName = suffix ? `.env.example${suffix}` : primaryExample;

    const envPathCurrent = path.resolve(cwd, envName);
    const examplePathCurrent =
      exampleFlag && !envFlag
        ? examplePath
        : fs.existsSync(path.resolve(cwd, exampleName))
        ? path.resolve(cwd, exampleName)
        : examplePath;

    if (!fs.existsSync(envPathCurrent) || !fs.existsSync(examplePathCurrent)) {
      console.log(
        chalk.bold(
          `🔍 Comparing ${envName} ↔ ${path.basename(examplePathCurrent)}...`,
        ),
      );
      console.log(chalk.yellow('  ⚠️  Skipping: missing matching example file.'));
      console.log();
      continue;
    }

    console.log(
      chalk.bold(
        `🔍 Comparing ${envName} ↔ ${path.basename(examplePathCurrent)}...`,
      ),
    );

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
        console.log(
          chalk.yellow(`      - ${key}: expected '${expected}', but got '${actual}'`),
        );
      });
    }
    console.log();
  }

  process.exit(exitWithError ? 1 : 0);
}
