# Configuration

dotenv-diff can be configured using CLI flags or a configuration file.
CLI flags always take precedence over configuration file values.

## Table of Contents

### General Flags

- [--init](#configuration-file)
- [--env](#--env-file)
- [--example](#--example-file)
- [--allow-duplicates](#--allow-duplicates)
- [--ignore](#--ignore-keys)
- [--ignore-regex](#--ignore-regex-patterns)
- [--fix](#--fix)
- [--json](#--json)
- [--color](#--color)
- [--no-color](#--no-color)
- [--ci](#--ci)
- [--yes](#-y---yes)

### File Scanning Flags

- [--files](#--files-patterns)
- [--include-files](#--include-files-patterns)
- [--exclude-files](#--exclude-files-patterns)

### Display Options

- [--show-unused](#--show-unused)
- [--no-show-unused](#--no-show-unused)
- [--show-stats](#--show-stats)
- [--no-show-stats](#--no-show-stats)

### Validation Flags

- [--strict](#--strict)
- [--secrets](#--secrets)
- [--no-secrets](#--no-secrets)
- [--ignore-urls](#--ignore-urls-list)
- [--uppercase-keys](#--uppercase-keys)
- [--no-uppercase-keys](#--no-uppercase-keys)
- [--expire-warnings](#--expire-warnings)
- [--no-expire-warnings](#--no-expire-warnings)
- [--inconsistent-naming-warnings](#--inconsistent-naming-warnings)
- [--no-inconsistent-naming-warnings](#--no-inconsistent-naming-warnings)

### Comparison Flags

- [--compare](#--compare)
- [--check-values](#--check-values)
- [--only](#--only-list)

## Configuration file

You can generate a default configuration file using the `--init` flag:

```bash
dotenv-diff --init
```

This creates a `dotenv-diff.config.json` file in the project root with an example configuration

> **Note:** You can use all CLI flags in the config file

## General Flags

### `--env <file>`

Path to a specific `.env` file (default: `.env`).

Example usage:

```bash
dotenv-diff --env .env.production
```

This is the `.env` file that will be compared against your codebase.

Commonly used together with the `--compare` flag:

```bash
dotenv-diff --compare --env .env.production --example .env.example
```

This compares the specified `.env.production` file against the `.env.example` file.

Usage in the configuration file:

```json
{
  "env": ".env.production"
}
```

### `--example <file>`

Path to the example `.env` file.

Example usage:

```bash
dotenv-diff --example .env.test
```

This can also be used as the `.env` file that will be compared against your codebase. (The `--example` flag will override the `--env` flag if both are provided.)

Again, this is also commonly used with the `--compare` flag:

```bash
dotenv-diff --compare --env .env.production --example .env.test
```

This compares the specified `.env.production` file against the `.env.test` file.

Usage in the configuration file:

```json
{
  "example": ".env.test"
}
```

In short, `--env` defines the runtime environment file, while `--example` defines the reference file used for comparison.

### `--allow-duplicates`

Allows duplicate keys in `.env` files without throwing a warning (or error in strict mode).

Example usage:

```bash
dotenv-diff --allow-duplicates
```

This is useful when you have legitimate reasons for duplicate keys in your environment files.

This flag can also be used together with the `--compare` flag:

Usage in the configuration file:

```json
{
  "allowDuplicates": true
}
```

### `--ignore <keys>`

Specify a comma-separated list of keys to ignore during the comparison other than the default ignored keys which is:

- `PWD`
- `NODE_ENV`
- `VITE_MODE`
- `MODE`
- `BASE_URL`
- `PROD`
- `DEV`
- `SSR`

This is useful when you have certain environment variables that are expected to differ between environments and you want to exclude them from the comparison.

Example usage:

```bash
dotenv-diff --ignore SECRET_KEY,API_TOKEN
```

This flag can also be used together with the `--compare` flag:

Usage in the configuration file:

```json
{
  "ignore": ["SECRET_KEY", "API_TOKEN"]
}
```

### `--ignore-regex <patterns>`

Specify a comma-separated list of regex patterns to ignore keys matching those patterns during the comparison.

This is useful when you have patterns of environment variable names that are expected to differ between environments and you want to exclude them from the comparison.

Example usage:

```bash
dotenv-diff --ignore-regex SECRET_,API_
```

This flag can also be used together with the `--compare` flag:

Usage in the configuration file:

```json
{
  "ignoreRegex": ["SECRET_", "API_"]
}
```

### `--fix`

Automatically fix issues found during the comparison by adding missing keys, remove duplicates and add .env to .gitignore if missing.

Example usage:

```bash
dotenv-diff --fix
```

This flag can also be used together with the `--compare` flag:

Usage in the configuration file:

```json
{
  "fix": true
}
```

### `--json`

Outputs the results in JSON format.

Example usage:

```bash
dotenv-diff --json
```

This flag can also be used together with the `--compare` flag:

Usage in the configuration file:

```json
{
  "json": true
}
```

### `--color`

Enables colored output in the terminal (enabled by default).

Example usage:

```bash
dotenv-diff --color
```

Usage in the configuration file:

```json
{
  "color": true
}
```

### `--no-color`

Disables colored output in the terminal.

Example usage:

```bash
dotenv-diff --no-color
```

Usage in the configuration file:

```json
{
  "noColor": true
}
```

### `--ci`

Run in CI mode: non-interactive and read-only.
Prevents all file creation and modification, including prompts for missing files.
Always exits with an error if issues are found. Recommended for CI/CD pipelines.

Example usage:

```bash
dotenv-diff --compare --ci
```

Usage in the configuration file:

```json
{
  "ci": true
}
```

### `-y, --yes`

Run non-interactively and automatically accept all prompts with "yes".
Useful for automation when you want to auto-create missing files or apply fixes without manual confirmation.
Cannot be combined with `--ci` (use one or the other).

Example usage:

```bash
dotenv-diff --compare --fix --yes
```

Usage in the configuration file:

```json
{
  "yes": true
}
```

## File Scanning Flags

### `--files <patterns>`

Specify a comma-separated list of file patterns to scan for environment variable usage.
This **completely replaces** the default file patterns (use `--include-files` to extend instead).
Useful when you want full control over which files are scanned.

Example usage:

```bash
dotenv-diff --files "src/**/*.ts,config/*.js"
```

Usage in the configuration file:

```json
{
  "files": ["src/**/*.ts", "config/*.js"]
}
```

### `--include-files <patterns>`

Specify a comma-separated list of file patterns to **add** to the default scan patterns.
This extends the default patterns rather than replacing them (unlike `--files`).
Useful when you want to include additional file types while keeping the defaults.

Example usage:

```bash
dotenv-diff --include-files "*.config.js,scripts/*.sh"
```

Usage in the configuration file:

```json
{
  "includeFiles": ["*.config.js", "scripts/*.sh"]
}
```

### `--exclude-files <patterns>`

Specify a comma-separated list of file patterns to exclude from scanning.
These patterns are added to the default exclude patterns (like `node_modules`, `dist`, etc.).
Useful when you want to skip specific files or directories that shouldn't be scanned.

Example usage:

```bash
dotenv-diff --exclude-files "tests/**,*.spec.ts"
```

Usage in the configuration file:

```json
{
  "excludeFiles": ["tests/**", "*.spec.ts"]
}
```

## Display Options

### `--show-unused`

List variables that are defined in `.env` but not used in the codebase (enabled by default).
Helps identify environment variables that may be outdated or unnecessary.

Example usage:

```bash
dotenv-diff --show-unused
```

Usage in the configuration file:

```json
{
  "showUnused": true
}
```

### `--no-show-unused`

Do not list variables that are defined in `.env` but not used in code.
Use this flag to hide the unused variables section from the output.

Example usage:

```bash
dotenv-diff --no-show-unused
```

Usage in the configuration file:

```json
{
  "showUnused": false
}
```

### `--show-stats`

Display statistics about the scan or comparison results (enabled by default).
Shows metrics like files scanned, total usages, unique variables, and warnings count.

Example usage:

```bash
dotenv-diff --show-stats
```

Usage in the configuration file:

```json
{
  "showStats": true
}
```

### `--no-show-stats`

Do not display statistics in the output.
Use this flag to hide the statistics section for a cleaner output.

Example usage:

```bash
dotenv-diff --no-show-stats
```

Usage in the configuration file:

```json
{
  "showStats": false
}
```

## Validation Flags

### `--strict`

Enable strict mode: treat all warnings as errors and exit with error code 1.
In strict mode, issues like unused variables, duplicates, secrets, and framework warnings will cause the process to fail.
Useful for enforcing strict environment variable hygiene in CI/CD pipelines.

Example usage:

```bash
dotenv-diff --strict
```

Usage in the configuration file:

```json
{
  "strict": true
}
```

### `--secrets`

Enable secret detection during codebase scan (enabled by default).
Scans your code for hardcoded secrets like API keys, tokens, passwords, and other sensitive values.
Detects high and medium severity secrets that may pose security risks.

Example usage:

```bash
dotenv-diff --secrets
```

Usage in the configuration file:

```json
{
  "secrets": true
}
```

### `--no-secrets`

Disable secret detection during scan.
Use this flag to skip the secret scanning phase and improve scan performance.

Example usage:

```bash
dotenv-diff --no-secrets
```

Usage in the configuration file:

```json
{
  "secrets": false
}
```

### `--ignore-urls <list>`

Specify a comma-separated list of URLs to ignore during secret detection.
Useful for whitelisting known safe URLs that might otherwise be flagged as potential secrets.
Uses case-insensitive substring matching.

Example usage:

```bash
dotenv-diff --ignore-urls https://safesecret
```

Usage in the configuration file:

```json
{
  "ignoreUrls": ["https://example.com", "localhost"]
}
```

### `--uppercase-keys`

Enable validation that environment variable keys follow UPPER*SNAKE_CASE naming convention (enabled by default).
Warns about keys that don't match the pattern `[A-Z0-9*]+` and suggests properly formatted alternatives.
Helps maintain consistent naming conventions across your environment files.

Example usage:

```bash
dotenv-diff --uppercase-keys
```

Usage in the configuration file:

```json
{
  "uppercaseKeys": true
}
```

### `--no-uppercase-keys`

Disable uppercase key validation.
Use this flag if your project uses different naming conventions for environment variables.

Example usage:

```bash
dotenv-diff --no-uppercase-keys
```

Usage in the configuration file:

```json
{
  "uppercaseKeys": false
}
```

### `--expire-warnings`

Enable detection of expiration dates for environment variables (enabled by default).
Detects `@expire` or `# @expire YYYY-MM-DD` comments in `.env` files and warns when variables are approaching or past their expiration date.
Useful for managing temporary API keys, tokens, or time-sensitive credentials.

Example usage:

```bash
dotenv-diff --expire-warnings
```

Usage in the configuration file:

```json
{
  "expireWarnings": true
}
```

### `--no-expire-warnings`

Disable expiration date warnings.
Use this flag to skip checking for `@expire` annotations in environment files.

Example usage:

```bash
dotenv-diff --no-expire-warnings
```

Usage in the configuration file:

```json
{
  "expireWarnings": false
}
```

### `--inconsistent-naming-warnings`

Detects inconsistent naming patterns in environment variable keys (enabled by default). This helps identify keys that are semantically the same but use different formatting styles (e.g., `API_KEY` vs `APIKEY`, `DATABASE_URL` vs `DATABASEURL`). The tool compares keys and warns when they match after removing underscores, suggesting the snake_case version as the standard.

Use this to maintain consistent naming conventions across your environment variables and avoid confusion.

Example usage:

```bash
dotenv-diff --inconsistent-naming-warnings
```

Usage in the configuration file:

```json
{
  "inconsistentNamingWarnings": true
}
```

### `--no-inconsistent-naming-warnings`

Disable inconsistent naming pattern warnings.

Example usage:

```bash
dotenv-diff --no-inconsistent-naming-warnings
```

Usage in the configuration file:

```json
{
  "inconsistentNamingWarnings": false
}
```

# Comparison Flags

This is flags related to comparing two `.env` files.
And can only be used in combination with the `--compare` flag.

### `--compare`

Explicitly enables the comparison between the specified `.env` file and the example `.env` file.

Example usage:

```bash
dotenv-diff --compare
```

This flag is useful when you want to ensure that your runtime environment file matches the structure of your example file.

Usage in the configuration file:

```json
{
  "compare": true
}
```

### `--check-values`

Compare not only the keys but also the values of the environment variables between the two files.

This flag can only be used in combination with the `--compare` flag.

Example usage:

```bash
dotenv-diff --compare --check-values
```

Usage in the configuration file:

```json
{
  "checkValues": true
}
```

### `--only <list>`

Specify a comma-separated list of keys to exclusively check in the comparison.

Example usage:

```bash
dotenv-diff --compare --only missing,duplicate
```

This flag can only be used in combination with the `--compare` flag.

`--only` accepts the following values:

- `missing`: Check for missing keys in the runtime `.env` file compared to the example file.
- `extra`: Check for extra keys in the runtime `.env` file that are not present in the example file.
- `empty`: Check for keys that have empty values in the runtime `.env` file.
- `duplicate`: Check for duplicate keys in either of the `.env` files.
- `gitignore`: check if the `.env` file is listed in `.gitignore`.

Usage in the configuration file:

```json
{
  "only": ["missing", "duplicate"]
}
```
