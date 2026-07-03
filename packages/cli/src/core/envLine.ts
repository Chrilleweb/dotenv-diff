/**
 * This module provides utility functions for parsing and handling dotenv files.
 */
export interface EnvKeyValue {
  key: string;
  value: string;
}

const BOM = '\uFEFF';

/** Strips a UTF-8 BOM from the start of the content, if present.
 * @param content - The content to strip the BOM from.
 * @returns The content without a BOM at the start.
 */
export function stripBom(content: string): string {
  return content.startsWith(BOM) ? content.slice(1) : content;
}

/** Splits dotenv content into lines, handling both LF and CRLF line endings.
 * @param content - The dotenv file content to split.
 * @returns An array of lines from the content.
 */
export function splitEnvLines(content: string): string[] {
  return stripBom(content).split(/\r?\n/);
}

/**
 * Parses a single dotenv line into a key/value pair.
 * Returns null for empty lines, comments, or lines without a valid key.
 * @param line - The dotenv line to parse.
 * @returns An object with `key` and `value` properties, or null if the line is invalid.
 */
export function parseEnvLine(line: string): EnvKeyValue | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  const eq = trimmed.indexOf('=');
  if (eq <= 0) return null; // no '=' or empty key

  const key = trimmed.slice(0, eq).trim();
  const value = trimmed.slice(eq + 1).trim();

  return { key, value };
}
