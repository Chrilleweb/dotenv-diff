import { parseEnvFile } from './parseEnv.js';
import { diffEnv } from './diffEnv.js';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const examplePath = path.resolve(process.cwd(), '.env.example');

const current = parseEnvFile(envPath);
const example = parseEnvFile(examplePath);

const diff = diffEnv(current, example);

if (diff.missing.length === 0 && diff.extra.length === 0) {
  console.log('✅ .env matcher .env.example');
  process.exit(0);
}

if (diff.missing.length > 0) {
  console.log('❌ Manglende nøgler i .env:');
  diff.missing.forEach((key) => console.log(`  - ${key}`));
}

if (diff.extra.length > 0) {
  console.log('⚠️  Ekstra nøgler i .env:');
  diff.extra.forEach((key) => console.log(`  - ${key}`));
}

process.exit(1);
