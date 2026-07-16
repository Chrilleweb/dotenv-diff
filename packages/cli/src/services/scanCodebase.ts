import fs from 'fs/promises';
import path from 'path';
import type { EnvUsage, ScanOptions, ScanResult } from '../config/types.js';
import { DEFAULT_EXCLUDE_KEYS } from '../core/helpers/filterIgnoredKeys.js';
import {
  detectSecretsInSource,
  type SecretFinding,
} from '../core/security/secretDetectors.js';
import { DEFAULT_EXCLUDE_PATTERNS } from '../core/scan/patterns.js';
import { scanFile } from '../core/scan/scanFile.js';
import { detectConfigSchemaKeys } from '../core/scan/detectConfigSchemaKeys.js';
import { createConcurrencyLimit } from '../core/helpers/concurrencyLimit.js';
import { findFiles } from './fileWalker.js';
import { normalizePath } from '../core/helpers/normalizePath.js';
import { isLikelyMinified } from '../core/helpers/isLikelyMinified.js';

const FILE_CONCURRENCY = 50;

/**
 * Scans the codebase for environment variable usage based on the provided options.
 * @param opts - Options for scanning the codebase.
 * @returns A promise that resolves to the scan result containing used, missing, and unused variables.
 */
export async function scanCodebase(opts: ScanOptions): Promise<ScanResult> {
  const files = await findFiles(opts.cwd, {
    include: opts.include,
    exclude: [...DEFAULT_EXCLUDE_PATTERNS, ...opts.exclude],
    ...(opts.files?.length && { files: opts.files }),
  });

  const limit = createConcurrencyLimit(FILE_CONCURRENCY);

  const processFile = async (filePath: string) => {
    const content = await safeReadFile(filePath);
    if (!content || isLikelyMinified(content)) return;

    const relativePath = normalizePath(path.relative(opts.cwd, filePath));
    const fileUsages = scanFile(filePath, content, opts);
    const secrets = safeDetectSecrets(relativePath, content, opts);
    const declaredKeys = detectConfigSchemaKeys(content);

    return { fileUsages, relativePath, content, secrets, declaredKeys };
  };

  const results = await Promise.all(
    files.map((f) => limit(() => processFile(f))),
  );

  const allUsages: EnvUsage[] = [];
  const allSecrets: SecretFinding[] = [];
  const allDeclaredKeys = new Set<string>();
  const fileContentMap = new Map<string, string>();
  let filesScanned = 0;

  for (const result of results) {
    if (!result) continue;
    const { fileUsages, relativePath, content, secrets, declaredKeys } = result;
    allUsages.push(...fileUsages);
    fileContentMap.set(relativePath, content);
    if (secrets.length) allSecrets.push(...secrets);
    for (const key of declaredKeys) allDeclaredKeys.add(key);
    filesScanned++;
  }

  // Filter out ignored variables
  const filteredUsages = allUsages.filter(
    (usage) =>
      !DEFAULT_EXCLUDE_KEYS.includes(usage.variable) &&
      !opts.ignore.includes(usage.variable) &&
      !opts.ignoreRegex.some((regex) => regex.test(usage.variable)),
  );

  const loggedVariables = filteredUsages.filter((u) => u.isLogged);

  return {
    used: filteredUsages,
    missing: [],
    unused: [],
    declaredKeys: [...allDeclaredKeys],
    secrets: allSecrets,
    stats: {
      filesScanned,
      totalUsages: filteredUsages.length,
      uniqueVariables: new Set(filteredUsages.map((u) => u.variable)).size,
      warningsCount: 0,
      duration: 0,
    },
    duplicates: {
      env: [],
      example: [],
    },
    logged: loggedVariables,
    fileContentMap,
  };
}

/**
 * Detects secrets in the given file content if secret detection is enabled.
 * @param relativePath - The relative path of the file being scanned.
 * @param content - The content of the file.
 * @param opts - The scan options.
 * @returns An array of secret findings.
 */
function safeDetectSecrets(
  relativePath: string,
  content: string,
  opts: ScanOptions,
): SecretFinding[] {
  if (!opts.secrets) return [];

  try {
    return detectSecretsInSource(relativePath, content, opts).filter(
      (s) => s.severity !== 'low',
    );
  } catch {
    return [];
  }
}

/**
 * Safely reads a file and returns its content or null if reading fails.
 * @param filePath - The path to the file to read.
 * @returns The file content as a string, or null if an error occurs.
 */
async function safeReadFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}
