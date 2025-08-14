import { Command } from 'commander';

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
    .option('--json', 'Output results in JSON format')
    .option(
      '--only <list>',
      'Comma-separated categories to only run (missing,extra,empty,mismatch,duplicate,gitignore)',
    )
    .option('--scan-usage', 'Scan codebase for environment variable usage')
    .option(
      '--include-files <patterns>',
      '[requires --scan-usage] Comma-separated file patterns to include in scan (default: **/*.{js,ts,jsx,tsx,vue,svelte})',
    )
    .option(
      '--exclude-files <patterns>',
      '[requires --scan-usage] Comma-separated file patterns to exclude from scan',
    )
    .option(
      '--show-unused',
      '[requires --scan-usage] Show variables defined in .env but not used in code',
    )
    .option(
      '--show-stats',
      'Show statistics (in scan-usage mode: scan stats, in compare mode: env compare stats)',
    );
}
