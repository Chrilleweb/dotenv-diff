import fs from 'fs';
import path from 'path';
import type { Framework } from '../../config/types.js';
import { FRAMEWORKS } from './registry.js';

/**
 * Interface representing the detected framework and its version
 */
interface FrameworkDetection {
  /** The detected framework */
  framework: Framework;
  /** The version range of the framework from package.json */
  version: string;
}

/**
 * Detects the framework being used in the project by checking package.json
 * @param cwd The current working directory of the project
 * @returns The detected framework and its version, or undefined if none is supported
 */
export function detectFramework(cwd: string): FrameworkDetection | undefined {
  const deps = readDependencies(cwd);

  for (const framework of FRAMEWORKS) {
    const version = deps[framework.packageName];
    if (version) {
      return { framework, version };
    }
  }

  return undefined;
}

/**
 * Reads dependencies and devDependencies from package.json
 * @param cwd The current working directory of the project
 * @returns Map of package names to version ranges (empty if package.json is missing or invalid)
 */
function readDependencies(cwd: string): Record<string, string> {
  try {
    const packageJsonPath = path.join(cwd, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      return {};
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    return {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };
  } catch {
    return {};
  }
}
