import fs from 'fs';

export function parseEnvFile(path: string): Record<string, string> {
  const content = fs.readFileSync(path, 'utf-8');
  const lines = content.split('\n');

  const result: Record<string, string> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const [key, ...rest] = trimmed.split('=');
    if (!key) continue;

    result[key.trim()] = rest.join('=').trim();
  }

  return result;
}
