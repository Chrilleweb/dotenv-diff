# Expiration Warnings

Expiration warnings help you track time-limited environment variables such as temporary API keys, tokens, and credentials.

By annotating a key with an expiration date, `dotenv-diff` can:

- warn when a key is expired
- warn when a key is close to expiration

## Syntax

Add an expiration annotation directly above the variable:

```env
# @expire 2026-12-31
TEMP_API_TOKEN=abc123
```

Supported annotation styles:

```env
# @expire 2026-12-31
TOKEN_A=...

// @expire 2026-12-31
TOKEN_B=...

@expire 2026-12-31
TOKEN_C=...

# expire 2026-12-31
TOKEN_D=...
```

### Rules

- Date format must be `YYYY-MM-DD`
- `@` is optional (`expire 2026-12-31` also works)
- The annotation applies to the **next env key only**
- A comment line between the annotation and the key is fine — the annotation still attaches to the key below it
- A **blank line ends the block**: an annotation will not "leak" across a blank line onto an unrelated key further down
- If no key follows, no warning is created

## Behavior

`dotenv-diff` uses two expiration thresholds:

- `<= 7 days`: treated as error and returns exit code `1`
- `<= 20 days`: treated as warning (error in strict mode)

## Strict mode

In strict mode, expiration warnings at `<= 20 days` are treated as blocking warnings and return exit code `1`.

```bash
dotenv-diff --strict
```

## Enable / disable

Expiration warnings are enabled by default.

Disable via CLI:

```bash
dotenv-diff --no-expire-warnings
```

Or disable in `dotenv-diff.config.json`:

```json
{
	"expireWarnings": false
}
```

You can also force-enable explicitly:

```bash
dotenv-diff --expire-warnings
```

## JSON output

With `--json`, expiration warnings are returned in the `expireWarnings` field:

```json
{
	"expireWarnings": [
		{
			"key": "TEMP_API_TOKEN",
			"date": "2026-12-31",
			"daysLeft": 30
		}
	]
}
```

## Pairing with `--comment-warnings`

> [`--comment-warnings`](./configuration_and_flags.md#--comment-warnings) is a standalone flag — it works with or without `@expire`. This section is only about why the two are especially useful **together**.

An `@expire` annotation tells you when a key stops being valid — but not what the key is or who should rotate it. `--comment-warnings` fills that gap by requiring every `.env.example` key to carry a human-readable comment.

Used together they cover both halves of credential hygiene:

- `@expire` catches keys that have gone stale (the _when_)
- `--comment-warnings` ensures every key explains itself (the _what / why / who_)

Crucially, an `@expire` annotation does **not** count as documentation on its own. This is deliberate — a bare machine annotation says nothing about a key's purpose, so a key with only an annotation above it is still reported as undocumented:

```env
# @expire 2026-12-31
API_KEY=
```

Add a real comment and the key satisfies both checks. The annotation is **transparent**: a comment placed above it (even across multiple comment lines) still documents the key below.

```env
# Third-party billing API key. Rotated by the platform team.
# @expire 2026-12-31
API_KEY=
```

Recommended in CI:

```bash
dotenv-diff --strict --comment-warnings
```

This fails the build both when a key is expired/expiring and when a key lacks documentation — so time-limited credentials never sit in `.env.example` as unexplained mystery values.

See [Comment Warnings](./comment_warnings.md) for more details.

## Best practices

- Use `YYYY-MM-DD` consistently
- Keep expiration comments immediately above the key they belong to
- Add a short comment describing why the key expires
- Combine with `--strict` in CI/CD to catch expired credentials early
- Pair with `--comment-warnings` so every expiring key also explains itself

See [Writing a Good `.env.example`](./env_example_best_practices.md) for a complete example file using `@expire` alongside documenting comments.
