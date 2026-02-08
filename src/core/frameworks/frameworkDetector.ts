import fs from 'fs';
import path from 'path';
import type { DetectedFramework } from '../../config/types.js';

/**
 * Interface representing the detected framework and its version (if applicable)
 */
interface FrameworkDetection {
  /** The detected framework (e.g., 'sveltekit', 'nextjs', or 'unknown') */
  framework: DetectedFramework;
  /** The version of the detected framework (if available) */
  version?: string;
}

/**
 * Detects the framework being used in the project
 * by checking package.json and file structure
 * @param cwd The current working directory of the project
 * @returns Detected framework and its version (if applicable)
 */
export function detectFramework(cwd: string): FrameworkDetection {
  try {
    const packageJsonPath = path.join(cwd, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      return { framework: 'unknown' };
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    // Check for SvelteKit
    if (deps['@sveltejs/kit']) {
      return {
        framework: 'sveltekit',
        version: deps['@sveltejs/kit'],
      };
    }

    // Check for Next.js
    if (deps['next']) {
      return {
        framework: 'nextjs',
        version: deps['next'],
      };
    }

    return { framework: 'unknown' };
  } catch {
    return { framework: 'unknown' };
  }
}
