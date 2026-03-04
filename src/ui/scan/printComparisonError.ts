import { error, warning, divider, header } from '../theme.js';

/**
 * Prints a comparison error message.
 * @param message The error message to print
 * @param shouldExit Whether the process should exit
 * @param json Whether to format the output as JSON
 * @returns An object indicating whether the process should exit
 */
export function printComparisonError(
  message: string,
  shouldExit: boolean,
  json: boolean,
): { exit: boolean } {
  if (json) return { exit: false };

  const indicator = shouldExit ? error('▸') : warning('▸');
  const colorFn = shouldExit ? error : warning;

  console.log();
  console.log(`${indicator} ${header('Error')}`);
  console.log(`${divider}`);
  console.log(`${colorFn(message)}`);
  console.log(`${divider}`);

  return { exit: shouldExit };
}
