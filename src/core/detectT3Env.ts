import fs from 'fs';
import path from 'path';
import type { T3EnvDetectionResult, T3EnvSchema } from '../config/types.js';

/**
 * Detects if a project uses t3-env by looking for env.ts files
 * @param cwd - Current working directory to scan
 * @returns Detection result with schema if found
 */
export async function detectT3Env(cwd: string): Promise<T3EnvDetectionResult> {
  const hasT3EnvDependency = await checkPackageJson(cwd);

  if (!hasT3EnvDependency) {
    return {
      detected: false,
      detectionMethod: null,
    };
  }

  // Check common locations for env config files
  const envFilePaths = [
    'src/env.ts',
    'src/env.mjs',
    'src/env.js',
    'env.ts',
    'env.mjs',
    'env.js',
    'lib/env.ts',
    'lib/env.mjs',
    'lib/env.js',
  ];

  for (const envPath of envFilePaths) {
    const fullPath = path.join(cwd, envPath);

    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');

      // Check if file contains t3-env usage
      if (content.includes('createEnv')) {
        const schema = parseT3EnvFromContent(content);
        if (schema) {
          return {
            detected: true,
            schema,
            detectionMethod: 'config',
            configPath: envPath,
          };
        }
      }
    }
  }

  return {
    detected: true,
    schema: { server: [], client: [] },
    detectionMethod: 'package.json',
  };
}

/**
 * Parses t3-env schema from file content
 */
export function parseT3EnvFromContent(content: string): T3EnvSchema | null {
  try {
    // Find server and client schema sections
    const serverMatch = content.match(
      /server\s*:\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/s,
    );
    const clientMatch = content.match(
      /client\s*:\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/s,
    );

    if (!serverMatch && !clientMatch) {
      return null;
    }

    const serverKeys =
      serverMatch && serverMatch[1]
        ? extractKeysFromSchema(serverMatch[1])
        : [];
    const clientKeys =
      clientMatch && clientMatch[1]
        ? extractKeysFromSchema(clientMatch[1])
        : [];

    return {
      server: serverKeys,
      client: clientKeys,
    };
  } catch {
    return null;
  }
}

/**
 * Extracts variable keys from schema block
 */
function extractKeysFromSchema(schemaBlock: string): string[] {
  const keys: string[] = [];

  // Match patterns like: VARIABLE_NAME: z.string()
  const keyPattern = /([A-Z_][A-Z0-9_]*)\s*:/g;
  let match;

  while ((match = keyPattern.exec(schemaBlock)) !== null) {
    if (match[1]) {
      keys.push(match[1]);
    }
  }

  return keys;
}

/**
 * Checks if t3-env is listed in package.json dependencies
 */
async function checkPackageJson(cwd: string): Promise<boolean> {
  const packageJsonPath = path.join(cwd, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    return false;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    return !!(allDeps['@t3-oss/env-core'] || allDeps['@t3-oss/env-nextjs']);
  } catch {
    return false;
  }
}
