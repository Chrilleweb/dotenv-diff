# Optional Keys

Mark a key `@optional` when your code copes with it being unset. `dotenv-diff` then stops reporting it as missing — you are free to leave it out of your `.env`.

## Syntax

Add the annotation directly above the key in `.env.example`:

```env
# Cache layer — falls back to an in-memory store when unset
# @optional
REDIS_URL=
```

Supported annotation styles, same as [`@expire`](./expiration_warnings.md):

```env
# @optional
KEY_A=

// @optional
KEY_B=

@optional
KEY_C=

# optional
KEY_D=
```

## Rules

- `@` is optional (`# optional` also works)
- The annotation applies to the **next env key only**
- A comment line between the annotation and the key is fine — the annotation still attaches to the key below it
- A **blank line ends the block**: the annotation will not leak across a gap onto an unrelated key further down
- The annotation must be **alone on its line**. `# @optional, falls back to memory` is read as an ordinary comment and has no effect — put the prose on its own line above it

## Behavior

Optional means "you don't have to set this", so both ways of not setting it are accepted:

| Situation | Required key (default) | `@optional` key |
|---|---|---|
| Absent from `.env` | reported as missing | not reported |
| Present but empty, in `--compare` | reported as empty | not reported |

Nothing else changes. An optional key is still checked for duplicates, secrets and naming, and is still reported as unused when nothing in your codebase reads it.

## No flag needed

`@optional` is always active — there is nothing to enable. Writing the annotation can only remove a warning, never add one, so adopting it cannot break an existing pipeline.

Note that the annotation is not documentation. A key with only `# @optional` above it still explains nothing about what it is for, so keep a real comment above the annotation.

## See also

- [Writing a Good `.env.example`](./env_example_best_practices.md) — a full example file using `@optional`
- [Expiration Warnings](./expiration_warnings.md) — the `@expire` annotation, same syntax rules
- [Comment Warnings](./comment_warnings.md) — what counts as a documented key
