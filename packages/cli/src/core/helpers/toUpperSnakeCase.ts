/** Convert key to proper UPPER_SNAKE_CASE
 * @param name - The environment variable name
 * @returns The name converted to UPPER_SNAKE_CASE
 */
export function toUpperSnakeCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2') // camelCase → camel_Case
    .replace(/[-\s]+/g, '_') // dashes/spaces → underscore
    .toUpperCase();
}
