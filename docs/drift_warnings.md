# Drift Warnings

Drift warnings flag keys that are set in your `.env` but never made it into `.env.example`. That is the classic onboarding bug: the app runs fine on your machine, and a new contributor clones the repo with no way to know the key exists.

On by default.

## Why the scan needs this

A scan compares your code against a **single** file. So in the ordinary repo — `.env` and `.env.example` side by side — the scan reads `.env`, and `.env.example` is never held up against the values you actually run with.

```env
# .env
DATABASE_URL=postgres://localhost
STRIPE_SECRET=sk_test_123     # reported (not in .env.example)

# .env.example
DATABASE_URL=
```

```text
▸ Drift between .env and .env.example
──────────────────────────────────────────────────────────────────────
STRIPE_SECRET               not documented in .env.example
──────────────────────────────────────────────────────────────────────
```

## Which env file is checked

The one the scan compared against — the report always concerns the file the run is about. With both `.env` and `.env.local` present the scan reads `.env`, so that is what drift checks; point [`--env`](./configuration_and_flags.md#--env-file) at `.env.local` to check that instead.

The one exception: when no `.env` exists, discovery falls through to comparing against `.env.example` itself. There the env file beside it is used, so a project running on `.env.local` alone is still checked rather than silently skipped.

## File pairing

Files are paired by the same suffix convention as [`--compare`](./compare.md): `.env.production` prefers `.env.example.production` and falls back to `.env.example`.

Any accepted example name works on either side — `.env.example`, `.env-example`, `.env.sample`, `.env.template`, in that priority order — so `.env.local` against a `.env.sample` pairs up fine.

`.env` itself and `.env`-plus-separator names (`.env.local`, `.env-local`) count as env files. `.envrc` does not: direnv's file is a shell script, not a dotenv file.

## Rules

- The check is **one-directional**: only keys present in an env file but absent from its example are reported. Keys documented in the example but not set locally are normal during development, and [`--compare`](./compare.md) already reports them
- Keys marked [`@optional`](./optional_keys.md) in the env file are skipped — the annotation already says the key is not required, so demanding it be documented would contradict it
- The annotation needs no handling on the example side: a key written there is documented by definition, whatever its annotations, so it can never drift
- Nothing is reported when a directory has no example file, or no env file
- Keys excluded by `--ignore` / `--ignore-regex`, and built-in excludes like `NODE_ENV`, are never reported

## Severity

Drift is a **warning**, not a failure: it does not change the exit code on its own. Under [`--strict`](./configuration_and_flags.md#--strict) it exits non-zero like every other warning. Each key costs 2 points of the [health score](./capabilities.md), and drift can be suppressed with a [baseline](./baseline.md) under the `drift` rule.

In JSON output each key appears under `driftWarnings` with the file pair it came from:

```json
{
  "driftWarnings": [
    {
      "key": "STRIPE_SECRET",
      "envFile": ".env.local",
      "exampleFile": ".env.example"
    }
  ]
}
```

## Enable / disable

On by default. Disable via CLI:

```bash
dotenv-diff --no-drift-warnings
```

Or in `dotenv-diff.config.json`:

```json
{
  "driftWarnings": false
}
```

## See also

- [Writing a Good `.env.example`](./env_example_best_practices.md) — keeping the example file worth reading
- [Comment Warnings](./comment_warnings.md) — the other half of a useful `.env.example`: keys that exist but are undocumented
- [Matrix Comparison](./matrix.md) — drift between 3+ environment files, side by side
- [Configuration and Flags](./configuration_and_flags.md#--no-drift-warnings) — full flag reference
