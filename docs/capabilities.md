# dotenv-diff capabilities

`dotenv-diff` scans your codebase for environment variable usage and checks it against your env files.

This document focuses on one question: **what does the scanner actually check for?**

The tool recognises the following patterns:

```typescript
// Node.js – dot and bracket notation
process.env.MY_KEY
process.env["MY_KEY"]
process.env['MY_KEY']

// Node.js – destructuring
const { MY_KEY } = process.env
const { MY_KEY: alias, OTHER_KEY = "fallback" } = process.env

// Vite / import.meta
import.meta.env.MY_KEY
import.meta.env["MY_KEY"]
import.meta.env['MY_KEY']

// SvelteKit – dynamic (env object)
import { env } from '$env/dynamic/private';
import { env } from '$env/dynamic/public';
env.MY_KEY
const { MY_KEY } = env
const { MY_KEY: alias, OTHER_KEY = "fallback" } = env

// SvelteKit – dynamic with aliased import
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
privateEnv.MY_KEY
const { MY_KEY } = privateEnv

// SvelteKit – static (named imports)
import { MY_KEY } from '$env/static/private';
import { MY_KEY } from '$env/static/public';
MY_KEY
```

## What It Checks For

> **Note:** The scanner skips files containing any line over 500 characters, as these are likely minified or bundled — this avoids false positives across all checks below.

Which files are scanned is determined by the file scanning configuration (see [configuration and flags](./configuration_and_flags.md#file-scanning-flags)).

### 1 Missing Variables

Variables that are **used in code** but **not defined** in the selected env comparison file.
In the standard text output, each missing variable is shown once with the first matching usage location.
Use `--json` if you need the full list of usages for the same variable.

### 2 Unused Variables

Variables that are **defined in env files** but **never used** in the scanned codebase.

### 3 Duplicate Keys

Duplicate variable definitions inside env files (both main env and example env, when available).

### 4 Secret Detection

Potential secrets and sensitive values, including high-risk patterns. See [Security Scanner](./security_scanner.md) for a full description of detection techniques and false positive protections.

### 5 Example File Secret Warnings

Potential secrets found in `.env.example` content. See the [Example File Scanning](./security_scanner.md#example-file-scanning) section of the Security Scanner docs.

### 6 Framework-Specific Misuse

Framework-aware warnings (for supported frameworks) around unsafe or incorrect env usage patterns. See [Framework Warnings](./frameworks/index.md).

### 7 Uppercase Naming Warnings

Variables that do not follow conventional uppercase env naming style.

### 8 Inconsistent Naming Warnings

Variables that appear to use mixed or conflicting naming patterns.

### 9 Console Log Exposure Warnings

Cases where environment-related values are logged with `console.log`.

### 10 Expiration Warnings

Warnings for environment values that look like expiring tokens/credentials or contain expiration metadata. See [Expiration Warnings](./expiration_warnings.md).

### 11 Gitignore Safety Check

Checks whether `.env` is properly ignored by `.gitignore`.

### 12 Typo Suggestions ("did you mean")

When a variable is reported as missing, `dotenv-diff` cross-references it against the keys that already exist and suggests the closest match when it looks like a simple spelling mistake.

- **Scan mode:** a variable used in code but not defined is matched against the keys defined in your env file.
- **Compare mode:** a key present in the example file but missing from the current file is matched against the extra keys the current file has.

For example, if your code uses `DATABASE_URL` but your `.env` defines `DATABAS_URL`, the missing entry is annotated with `→ did you mean DATABAS_URL?`.

Only close matches are suggested (small edit distance, scaled to key length), and only the single closest key is shown per missing variable. Suggestions are advisory — they do **not** affect the exit code or the health score. Disable them with `--no-suggest`.

### 13 Health Score

A final score based on scan findings (missing, unused, duplicates, security warnings, and more).
