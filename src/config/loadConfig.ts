import fs from "fs";
import path from "path";
import type { RawOptions } from "./types.js";
import { printConfigLoaded, printConfigLoadError } from "../ui/shared/printConfigStatus.js";

/**
 * Loads dotenv-diff.config.json (if present)
 * and merges it with CLI flags.
 * CLI options always take precedence.
 * @param cliOptions - Options provided via CLI
 * @return Merged options
 */
export function loadConfig(cliOptions: Partial<RawOptions>): RawOptions {
  const cwd = process.cwd();
  const configPath = path.join(cwd, "dotenv-diff.config.json");

  let fileConfig: Partial<RawOptions> = {};

  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, "utf8");
      fileConfig = JSON.parse(raw);
      printConfigLoaded(configPath);
    } catch (err) {
      printConfigLoadError(err);
    }
  }

  // Merge: config file first, then CLI options override
  return {
    ...fileConfig,
    ...cliOptions,
  };
}
