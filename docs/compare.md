# Comparing Two Environment Files

When you have multiple `.env` files (like `.env.production`, `.env.staging`, `.env.example`), you might want to compare them to ensure they match in structure and optionally in values.

The `--compare` flag allows you to compare two environment files directly.

## Basic Usage

```bash
dotenv-diff --compare
```

By default, this compares your runtime `.env` file against your `.env.example` file.

## Specifying Files to Compare

You can specify exactly which files to compare using `--env` and `--example` flags:

```bash
dotenv-diff --compare --env .env.production --example .env.example
```

This compares `.env.production` against `.env.example`.

## What Gets Checked

By default, the comparison checks for:

- **Missing keys**: Keys in the example file that are missing in the runtime file
- **Extra keys**: Keys in the runtime file that are not in the example file
- **Empty values**: Keys with empty values in the runtime file
- **Duplicates**: Duplicate keys in either file
- **.gitignore**: Whether the runtime `.env` file is listed in `.gitignore`

## Checking Values Too

By default, only keys are compared. To also compare the **values** of environment variables:

```bash
dotenv-diff --compare --check-values
```

This will highlight differences in actual variable values (not just missing/extra keys).

## Checking Only Specific Issues

Use the `--only` flag to check for specific types of issues:

```bash
dotenv-diff --compare --only missing,duplicate
```

Valid options:
- `missing`: Missing keys in the runtime file
- `extra`: Extra keys in the runtime file
- `empty`: Empty values in the runtime file
- `duplicate`: Duplicate keys
- `gitignore`: `.env` file not in `.gitignore`

## Configuration File

You can also configure comparison in `dotenv-diff.config.json`:

```json
{
  "compare": true,
  "env": ".env.production",
  "example": ".env.example",
  "checkValues": true,
  "only": ["missing", "duplicate"]
}
```

Then run:

```bash
dotenv-diff
```

## Common Use Cases

**Before deployment**: Compare production `.env` against template to ensure all required variables are set:

```bash
dotenv-diff --compare --env .env.production --example .env.example --strict
```

**Use compare together with `--fix`**: Automatically add missing keys from example to runtime file:

```bash
dotenv-diff --compare --env .env.staging --example .env.production --fix
```
