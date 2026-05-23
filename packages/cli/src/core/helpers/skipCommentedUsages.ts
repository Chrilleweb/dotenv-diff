import type { EnvUsage } from '../../config/types.js';
import { hasIgnoreComment } from '../../core/security/secretDetectors.js';

/**
 * Filters out commented usages from the list.
 * Skipping comments:
 *   // process.env.API_URL
 *   # process.env.API_URL
 *   /* process.env.API_URL
 *   * process.env.API_URL
 *   <!-- process.env.API_URL -->
 * @param usages - List of environment variable usages
 * @returns Filtered list of environment variable usages
 */
export function skipCommentedUsages(usages: readonly EnvUsage[]): EnvUsage[] {
  let insideHtmlComment = false;
  let insideIgnoreBlock = false;

  return usages.filter((u) => {
    if (!u.context) return true;
    const line = u.context.trim();

    if (/<!--\s*dotenv[\s-]*diff[\s-]*ignore[\s-]*start\s*-->/i.test(line)) {
      insideIgnoreBlock = true;
      return false;
    }

    if (/<!--\s*dotenv[\s-]*diff[\s-]*ignore[\s-]*end\s*-->/i.test(line)) {
      insideIgnoreBlock = false;
      return false;
    }

    if (line.includes('<!--')) insideHtmlComment = true;
    if (line.includes('-->')) {
      insideHtmlComment = false;
      return false;
    }

    if (insideIgnoreBlock) return false;

    return (
      !insideHtmlComment &&
      !/^\s*(\/\/|#|\/\*|\*|<!--|-->)/.test(line) &&
      !hasIgnoreComment(line)
    );
  });
}
