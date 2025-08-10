import { Command } from 'commander';

export function createProgram() {
  return new Command()
    .name('dotenv-diff')
    .description('Compare .env and .env.example files')
    .option('--check-values', 'Compare actual values if example has values')
    .option('--ci', 'Run non-interactively and never create files')
    .option('-y, --yes', 'Run non-interactively and answer Yes to prompts')
    .option('--env <file>', 'Path to a specific .env file')
    .option('--example <file>', 'Path to a specific .env.example file');
}
