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

## Best practices

- Use `YYYY-MM-DD` consistently
- Keep expiration comments immediately above the key they belong to
- Add a short comment describing why the key expires
- Combine with `--strict` in CI/CD to catch expired credentials early
