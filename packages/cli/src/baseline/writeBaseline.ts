import type { ExitResult, ScanResult } from '../config/types.js';
import {
  printBaselineWritten,
  printBaselineError,
} from '../ui/scan/printBaseline.js';
import {
  BASELINE_FILE,
  collectBaselineEntries,
  writeBaselineFile,
} from './scanBaseline.js';

/**
 * Writes the current scan state as a baseline file and reports the outcome.
 * Returns exitWithError: false so the caller exits cleanly.
 * @param scanResult The full scan result to convert into baseline entries and write to disk
 * @param cwd The current working directory to resolve the baseline file from
 * @param asJson Whether to output results in JSON format (true) or console format (false)
 * @returns An object indicating whether to exit with an error code (always false for this function)
 */
export async function writeBaseline(
  scanResult: ScanResult,
  cwd: string,
  asJson: boolean,
): Promise<ExitResult> {
  const entries = collectBaselineEntries(scanResult);
  let filePath: string;
  try {
    filePath = await writeBaselineFile(cwd, entries);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (asJson) {
      console.log(JSON.stringify({ ok: false, error: message }, null, 2));
    } else {
      printBaselineError(message);
    }
    return { exitWithError: true };
  }

  if (asJson) {
    console.log(
      JSON.stringify(
        { file: BASELINE_FILE, warningsStored: entries.length },
        null,
        2,
      ),
    );
  } else {
    printBaselineWritten(entries.length, filePath);
  }
  return { exitWithError: false };
}
