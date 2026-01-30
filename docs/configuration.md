# Configuration

dotenv-diff can be configured using CLI flags or a configuration file.
CLI flags always take precedence over configuration file values.


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
