# Monorepo Support

In monorepos with multiple apps and shared packages, environment variables are often referenced across folder boundaries.

`dotenv-diff` supports this by scanning from your current app and letting you extend the scan scope to shared folders.

## Scanning shared packages

By default, `dotenv-diff` scans from the current working directory.

In a monorepo, use `--include-files` to add shared package paths:

```json
{
  "scripts": {
    "dotenv-diff": "dotenv-diff --example .env.example --include-files '../../packages/**/*'"
  }
}
```

### What this does

- Scans the current application
- Compares your environment variables against `.env.example`
- Includes shared packages from the monorepo (for example `../../packages/**/*`)
- Detects env usage across app + shared code

## Using a configuration file

For larger monorepos, move file patterns and ignores to `dotenv-diff.config.json`:

```json
{
  "example": ".env.example",
  "includeFiles": ["../../packages/**/*"],
}
```

Then run:

```bash
dotenv-diff
```

## `--include-files` vs `--files`

- `--include-files` **extends** default scan patterns
- `--files` **replaces** default scan patterns completely

For monorepos, `--include-files` is usually the best default because you keep built-in scanning and only add shared paths.

## Why this matters in monorepos

- Undocumented variables are harder to detect when usage is spread across apps/packages
- Keeping `.env.example` accurate becomes harder as shared code grows
- One app-local scan can still include cross-folder usage and reduce drift

## Best practices

- Run `dotenv-diff` from the app folder that owns the `.env` / `.env.example` pair
- Add shared package globs with `--include-files` (or `includeFiles` in config)
- Keep `ignore` small and explicit
- Use `--strict` in CI to fail fast on warnings and missing variables