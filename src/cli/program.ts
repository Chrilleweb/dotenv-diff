import { Command } from 'commander';

/**
 * Creates the command-line program for dotenv-diff.
 * @returns The configured commander program instance
 */
export function createProgram() {
  return new Command()
    .name('dotenv-diff')
    .description('Compare .env and .env.example files')
    .option('--check-values', 'Compare actual values if example has values')
    .option('--ci', 'Run non-interactively and never create files')
    .option('-y, --yes', 'Run non-interactively and answer Yes to prompts')
    .option('--env <file>', 'Path to a specific .env file')
    .option('--example <file>', 'Path to a specific .env.example file')
    .option(
      '--allow-duplicates',
      'Do not warn about duplicate keys in .env* files',
    )
    .option('--ignore <keys>', 'Comma-separated list of keys to ignore')
    .option('--ignore-regex <pattern>', 'Regex pattern to ignore matching keys')
    .option(
      '--fix',
      'Automatically fix common issues: remove duplicates, add missing keys',
    )
    .option('--json', 'Output results in JSON format')
    .option('--color', 'Enable colored output')
    .option('--no-color', 'Disable colored output')
    .option(
      '--only <list>',
      'Comma-separated categories to only run (missing,extra,empty,mismatch,duplicate,gitignore)',
    )
    .option('--scan-usage', 'Scan codebase for environment variable usage')
    .option('--compare', 'Compare .env and .env.example files')
    .option(
      '--include-files <patterns>',
      'Comma-separated file patterns to ADD to default scan patterns (extends default)',
    )
    .option(
      '--files <patterns>',
      'Comma-separated file patterns to scan (completely replaces default patterns)',
    )
    .option(
      '--exclude-files <patterns>',
      'Comma-separated file patterns to exclude from scan',
    )
    .option(
      '--show-unused',
      'List variables that are defined in .env but not used in code',
    )
    .option(
      '--no-show-unused',
      'Do not list variables that are defined in .env but not used in code',
    )
    .option('--show-stats', 'Show statistics')
    .option('--no-show-stats', 'Do not show statistics')
    .option('--strict', 'Enable fail on warnings')
    .option(
      '--secrets',
      'Enable secret detection during scan (enabled by default)',
    )
    .option(
      '--no-secrets',
      'Disable secret detection during scan (enabled by default)',
    )
    .option(
      '--ignore-urls <list>',
      'Comma-separated URLs to ignore in secret scan',
    )
    .option(
      '--uppercase-keys',
      'Enable uppercase key validation (enabled by default)',
    )
    .option('--no-uppercase-keys', 'Disable uppercase key validation')
    .option(
      '--expire-warnings',
      'Enable expiration date warnings for environment variables (enabled by default)',
    )
    .option('--no-expire-warnings', 'Disable expiration date warnings')
    .option(
      '--inconsistent-naming-warnings',
      'Enable inconsistent naming pattern warnings (enabled by default)',
    )
    .option(
      '--no-inconsistent-naming-warnings',
      'Disable inconsistent naming pattern warnings',
    )
    .option('--t3env', 'Warns about specifik Next.js t3env usage patterns')
    .option('--no-t3env', 'Disables warnings about Next.js t3env usage patterns')
    .option('--init', 'Create a sample dotenv-diff.config.json file');
}
