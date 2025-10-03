import chalk from 'chalk';

export interface SecretFinding {
  file: string;
  line: number;
  message: string;
  snippet: string;
}

/**
 * Print potential secrets detected in the codebase.
 *
 * @param secrets - Array of secret findings
 * @param json - Whether to output in JSON format
 */
export function printSecrets(secrets: SecretFinding[], json: boolean): void {
  if (json) return;
  if (!secrets || secrets.length === 0) return;

  console.log(chalk.yellow('🔒 Potential secrets detected in codebase:'));

  // Group by file
  const byFile = new Map<string, SecretFinding[]>();
  for (const f of secrets) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file)!.push(f);
  }

  for (const [file, findings] of byFile) {
    console.log(chalk.bold(`  ${file}`));
    for (const f of findings) {
      console.log(
        chalk.yellow(
          `   - Line ${f.line}: ${f.message}\n     ${chalk.dim(f.snippet)}`,
        ),
      );
    }
  }

  console.log();
}
