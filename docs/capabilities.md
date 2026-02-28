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

// SvelteKit – static (named imports)
import { MY_KEY } from '$env/static/private';
import { MY_KEY } from '$env/static/public';
MY_KEY
```

Default scanned file types: .ts, .js, jsx, tsx, vue, .mjs, .mts, .cjs, .cts, .svelte

## What It Checks For

### 1 Missing Variables

Variables that are **used in code** but **not defined** in the selected env comparison file.

### 2 Unused Variables

Variables that are **defined in env files** but **never used** in the scanned codebase.

### 3 Duplicate Keys

Duplicate variable definitions inside env files (both main env and example env, when available).

### 4 Secret Detection

Potential secrets and sensitive values, including high-risk patterns.

### 5 Example File Secret Warnings

Potential secrets found in `.env.example` content.

### 6 Framework-Specific Misuse

Framework-aware warnings (for supported frameworks) around unsafe or incorrect env usage patterns.

### 7 Uppercase Naming Warnings

Variables that do not follow conventional uppercase env naming style.

### 8 Inconsistent Naming Warnings

Variables that appear to use mixed or conflicting naming patterns.

### 9 Console Log Exposure Warnings

Cases where environment-related values are logged with `console.log`.

### 10 Expiration Warnings

Warnings for environment values that look like expiring tokens/credentials or contain expiration metadata.

### 11 Gitignore Safety Check

Checks whether `.env` is properly ignored by `.gitignore`.

### 12 Health Score

A final score based on scan findings (missing, unused, duplicates, security warnings, and more).
