# Baseline Workflow

The `--baseline` flag helps you adopt `dotenv-diff` in projects that already contain known warnings.

It records the current warning state into a baseline file, so future runs can focus on newly introduced issues.

## What `--baseline` does

When you run:

```bash
dotenv-diff --baseline
```

dotenv-diff will:

- scan your codebase as normal
- collect the warnings from the current scan result
- write a `dotenv-diff.baseline.json` file in the working directory
- exit cleanly (`exit code 0`) after writing the file

On later runs (without `--baseline`), dotenv-diff automatically loads this file and suppresses matching warnings.

## Baseline file location

The baseline file is written in your current working directory:

```text
dotenv-diff.baseline.json
```

In monorepos, this means each app/package can keep its own baseline by running dotenv-diff from that folder.

## Supported warning categories

Baseline suppression supports the same categories produced by scan usage checks, including:

- missing variables
- unused variables
- duplicate keys (`.env` / `.env.example`)
- framework warnings
- uppercase key warnings
- inconsistent naming warnings
- expiration warnings
- secret findings (stored as fingerprints)
- `.env.example` secret warnings

## JSON mode

You can combine baseline with JSON output:

```bash
dotenv-diff --baseline --json
```

Success output includes:

- `ok: true`
- `filePath`
- `entryCount`

If writing fails, JSON output returns `ok: false` with an error message.

## Recommended workflow

1. Create a baseline once for the current state:

```bash
dotenv-diff --baseline
```

2. Commit `dotenv-diff.baseline.json`.

3. Run dotenv-diff normally in local development and CI.

4. Fix issues incrementally and remove stale baseline entries over time.

5. Recreate the baseline only when you intentionally accept a new known warning set.

## Best practices

- Review baseline changes in pull requests like any other code change.
- Keep the baseline file small by removing entries after fixes.
- Prefer fixing warnings over growing the baseline indefinitely.
- Avoid regenerating baseline automatically in CI; treat it as a reviewed artifact.

## Related docs

- [Configuration and Flags](./configuration_and_flags.md#--baseline)
- [Git Hooks and CI/CD](./git_hooks_ci.md)
- [Monorepo Support](./monorepo_support.md)
