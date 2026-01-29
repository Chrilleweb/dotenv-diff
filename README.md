# dotenv-diff

Scan your entire codebase to detect every environment variable reference. It helps you catch missing, unused, duplicated, and misused variables early, before they cause runtime errors.

First-class support for SvelteKit and Next.js. Also works well in modern JavaScript/TypeScript projects and frameworks like Node.js, Nuxt, and Vue — or any other setup where you want reliable .env file comparison.

[![Coverage Status](https://codecov.io/gh/Chrilleweb/dotenv-diff/branch/main/graph/badge.svg)](https://codecov.io/gh/Chrilleweb/dotenv-diff)
[![npm version](https://img.shields.io/npm/v/dotenv-diff.svg)](https://www.npmjs.com/package/dotenv-diff)
[![npm downloads](https://img.shields.io/npm/dt/dotenv-diff.svg)](https://www.npmjs.com/package/dotenv-diff)

---

### Warnings & errors detection
![Demo](./docs/demo3.gif)

### Clean / successful scan
![Successful Scan](./docs/successful-scan.png)

---

## Why dotenv-diff?

- Ensure all required environment variables are defined before deploying
- Catch missing or misconfigured variables early in development
- Improve collaboration by keeping teams aligned on required variables
- Reduce the risk of committing sensitive data
- Scale easily for monorepos and multi-environment setups

---

## Automatic Fixes (`--fix`)

Automatically add missing variables to your `.env` file:

```bash
dotenv-diff --fix
```

### Example

1. Code uses `process.env.NEW_API_KEY`
2. Run `dotenv-diff --fix`
3. Tool adds `NEW_API_KEY=` to `.env` or `.env.example`

---

## Strict Mode

Treat warnings as errors (useful for CI):

```bash
dotenv-diff --strict
```

---

## Configuration (`--init`)

Generate a default config file:

```bash
dotenv-diff --init
```

This creates a dotenv-diff.config.json file:

```json
{
  "strict": false,
  "example": ".env.example",
  "ignore": ["NODE_ENV", "VITE_MODE"],
  "ignoreUrls": ["https://example.com"]
}
```

**Configuration options:**
- **`strict`** (boolean): Treat warnings as errors (default: false)
- **`example`** (string): Path to .env file to compare against (or example path for `--compare`)
- **`ignore`** (array): Array of environment variable names to ignore
- **`ignoreUrls`** (array): URL patterns to ignore when scanning files

You can use all CLI flags in the config file.

> **Note:** You can use all CLI flags in the config file and CLI flags always override config file values.

---

## Framework-Specific Warnings

In SvelteKit and Next.js projects, dotenv-diff detects framework-specific
environment variable misuses.

Example warning:

```bash
Framework issues (Sveltekit):
  - PUBLIC_URL (src/routes/+page.ts:1)
    → Variables accessed through import.meta.env must start with "VITE_"
```

---

## Expiration Warnings

Add expiration metadata to variables:

```bash
# @expire 2025-12-31
API_TOKEN=
```

---

## File Scanning Options

Include or exclude files:

```bash
dotenv-diff --include-files '**/*.js,**/*.ts' --exclude-files '**/*.spec.ts'
```

Override defaults:

```bash
dotenv-diff --files '**/*.js'
```

---

## Compare Environment Files

```bash
dotenv-diff --compare
```

Compare specific files:

```bash
dotenv-diff --compare --env .env.local --example .env.example.local
```

---

## Monorepo (Turborepo) Usage

In monorepos with multiple apps and packages, you can include shared folders:

```json
{
  "scripts": {
    "dotenv-diff": "dotenv-diff --example .env.example --include-files '../../packages/**/*' --ignore VITE_MODE"
  }
}
```

This will:
- Scan the current app
- Include shared packages
- Ignore variables used only in specific environments

---

## Exit Codes

- `0` → No errors
- `1` → Errors found (or warnings in strict mode)

---

## Documentation

Full documentation: https://dotenv-diff-docs.vercel.app

---

## 🤝 Contributing

Issues and pull requests are welcome.  
For large changes, please open an issue first.

---

## License

Licensed under the [MIT](LICENSE) license.

Created by [chrilleweb](https://github.com/chrilleweb)
