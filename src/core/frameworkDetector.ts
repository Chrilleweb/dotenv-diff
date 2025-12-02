import fs from 'fs';
import path from 'path';

export type Framework = 'sveltekit' | 'angular' | 'unknown';

export interface FrameworkDetection {
  framework: Framework;
  version?: string;
}

/**
 * Detects the framework being used in the project
 * by checking package.json and file structure
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

    // Check for Angular
    if (deps['@angular/core']) {
      return {
        framework: 'angular',
        version: deps['@angular/core'],
      };
    }

    return { framework: 'unknown' };
  } catch (error) {
    return { framework: 'unknown' };
  }
}