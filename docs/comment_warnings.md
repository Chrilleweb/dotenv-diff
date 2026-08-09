# Comment Warnings

Comment warnings flag `.env.example` keys that lack a documenting comment. A well documented `.env.example` is the fastest onboarding for a new contributor.

Opt-in — off by default.

## What counts as documented

A key is **documented** when either:

- it has an **inline** `#` comment after the value, or
- a real `#` comment sits in the run of comment lines **directly above** it

```env
# Stripe webhook signing secret
STRIPE_WEBHOOK_SECRET=      # documented (comment above)
PORT=3000 # server port     # documented (inline comment)
API_KEY=                    # reported (undocumented)
```

## Rules

- The comment must be **directly above** the key, or inline after the value
- A **blank line** ends the run — a comment above a blank line does not document the key below it
- `@expire` annotation lines are **transparent**: a bare `# @expire 2026-12-31` is not documentation on its own, but a real comment above it still documents the key (see [Expiration Warnings](./expiration_warnings.md#pairing-with---comment-warnings))
- A shared section header (e.g. `# === Database ===`) counts only for the **first** key directly beneath it — keys further down are still reported

```env
# API key for the billing service, rotated quarterly.
# @expire 2026-12-31
API_KEY=                    # documented (comment above the annotation)
```

## Enable / disable

Off by default. Enable via CLI:

```bash
dotenv-diff --comment-warnings
```

Or in `dotenv-diff.config.json`:

```json
{
  "commentWarnings": true
}
```

## See also

- [Writing a Good `.env.example`](./env_example_best_practices.md) — a full example file that passes this check
- [Expiration Warnings](./expiration_warnings.md) — why `--comment-warnings` pairs well with `@expire`
- [Configuration and Flags](./configuration_and_flags.md#--comment-warnings) — full flag reference
