/**
 * Signals that a file consumes the entire `process.env` object rather than a
 * single `process.env.X` key — the hallmark of a central config loader
 * (Zod/envalid schemas, direct assignment, spread). When one of these is present
 * we treat the file's UPPER_SNAKE_CASE object keys as env declarations.
 */
const WHOLESALE_ENV_SIGNALS: RegExp[] = [
  /\.(?:safeParse|parse)\s*\(\s*process\.env\b/, // zod: schema.parse(process.env)
  /\bcleanEnv\s*\(\s*process\.env\b/, // envalid: cleanEnv(process.env, {...})
  /=\s*process\.env(?!\s*[.[])/, // const env = process.env
  /\{\s*\.\.\.process\.env\b/, // { ...process.env }
];

/**
 * Matches UPPER_SNAKE_CASE object-literal keys, e.g. `CLIENT_SECRET_GITHUB:` or
 * `"CLIENT_SECRET_GITHUB":`, in a key position (start of line, or after `{`, `,`,
 * `(`, or whitespace).
 */
const OBJECT_KEY_PATTERN = /(?:^|[\s{,(])["']?([A-Z_][A-Z0-9_]*)["']?\s*:/gm;

/**
 * Extracts env-variable keys that a central config loader declares as object
 * keys while consuming the whole `process.env` object.
 *
 * This surfaces variables that are read indirectly — e.g. a Zod schema
 * `z.object({ CLIENT_SECRET_GITHUB: ... }).parse(process.env)` whose values are
 * later accessed as `appCfg.CLIENT_SECRET_GITHUB` — which the literal
 * `process.env.X` scanner never sees. The returned keys are used only to
 * suppress false "unused" findings; they do not count as usages for missing
 * detection, stats, or the health score.
 *
 * @param content - The full source of a file.
 * @returns UPPER_SNAKE_CASE keys declared in the file, or an empty array when the
 *   file does not consume the whole `process.env` object.
 */
export function detectConfigSchemaKeys(content: string): string[] {
  const consumesWholeEnv = WHOLESALE_ENV_SIGNALS.some((rx) => rx.test(content));
  if (!consumesWholeEnv) return [];

  const keys = new Set<string>();
  OBJECT_KEY_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = OBJECT_KEY_PATTERN.exec(content)) !== null) {
    keys.add(match[1]!);
  }

  return [...keys];
}
