# Configuration

dotenv-diff can be configured using CLI flags or a configuration file.
CLI flags always take precedence over configuration file values.

- [--init](#configuration-file)
- [--env](#--env-file)
- [--example](#--example-file)
- [--allow-duplicates](#--allow-duplicates)
- [--compare](#--compare)
- [--check-values](#--check-values)

## Configuration file

You can generate a default configuration file using the `--init` flag:

```bash
dotenv-diff --init
```

This creates a `dotenv-diff.config.json` file in the project root with an example configuration

> **Note:** You can use all CLI flags in the config file

## CLI flags

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

Allows duplicate keys are a boolean flag that allows duplicate keys in the `.env` files without throwing a warning (or error in strict mode).

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
