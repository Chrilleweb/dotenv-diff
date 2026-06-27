# Comparing 3+ Environment Files (Matrix)

When you have more than two `.env` files — for example `.env.production`, `.env.staging`, and `.env.example` — you often want to see which keys differ *between* environments, not just against a single reference file.

The `--matrix` flag compares any number of env files side-by-side as a key-presence table.

## Basic Usage

Auto-discover every `.env*` file in the current directory and compare them all:

```bash
dotenv-diff --matrix
```

## Comparing Specific Files

Pass file names explicitly to compare only those files (this replaces auto-discovery):

```bash
dotenv-diff --matrix .env.production .env.staging .env.example
```

## What It Shows

For every unique key found across all files, the matrix shows whether each file defines it:

```
KEY               .env.production  .env.staging  .env.example
─────────────────────────────────────────────────────────────
DATABASE_URL      ✓                ✓             ✓
API_KEY           ✓                ✗             ✓
STRIPE_SECRET     ✓                ✓             ✗
```

- `✓` — the file defines this key
- `✗` — the file is missing this key
- `≠` — the file defines this key, but with a different value than other files (only shown with `--check-values`)

## Checking Values Too

By default, only key presence is compared. To also flag keys whose **value** differs between files:

```bash
dotenv-diff --matrix --check-values
```

## Ignoring Keys

`--ignore` and `--ignore-regex` work the same way as in `--compare`:

```bash
dotenv-diff --matrix --ignore NODE_ENV,PORT
dotenv-diff --matrix --ignore-regex "^DEBUG_"
```

## JSON Output

```bash
dotenv-diff --matrix --json
```

Outputs a structured result:

```json
{
  "files": [".env.production", ".env.staging", ".env.example"],
  "rows": [
    {
      "key": "API_KEY",
      "presence": [true, false, true],
      "values": ["prod-key", null, ""],
      "hasMismatch": false
    }
  ],
  "allMatch": false
}
```

## Exit Codes

Unlike `--compare`, matrix mode has no single "source of truth" file — every file is an equal column. Because of this, `--matrix` exits with code `1` whenever any key is missing from at least one file (or has a mismatched value with `--check-values`), and `0` when every file matches exactly. This makes it easy to use in CI to catch environments drifting out of sync.

## Requirements

Matrix mode needs at least 2 `.env*` files to compare. If fewer are found (or an explicitly named file doesn't exist), `dotenv-diff` prints an error and exits with code `1`.
