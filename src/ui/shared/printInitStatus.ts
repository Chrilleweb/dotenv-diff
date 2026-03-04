import { label, value, accent, warning, divider, header } from '../theme.js';

/**
 * Printed when the config file is successfully created
 * @param path - The path to the created config file
 * @returns void
 */
export function printInitSuccess(path: string): void {
  console.log();
  console.log(`${accent('▸')} ${header('Config created')}`);
  console.log(`${divider}`);
  console.log(`${label('Path'.padEnd(26))}${value(path)}`);
  console.log(`${divider}`);
}

/**
 * Printed when config file already exists
 * @param path - The path to the existing config file
 * @returns void
 */
export function printInitExists(path: string): void {
  console.log();
  console.log(`${warning('▸')} ${header('Config already exists')}`);
  console.log(`${divider}`);
  console.log(`${label('Path'.padEnd(26))}${value(path)}`);
  console.log(`${divider}`);
}
