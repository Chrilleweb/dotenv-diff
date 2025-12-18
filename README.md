# dotenv-diff

![Demo](./public/demo3.gif)

`dotenv-diff` scans your codebase to detect which environment variables are used
and compares them against your `.env` or `.env.example` files.

It helps you catch missing, unused, or misconfigured environment variables **before deployment**.

Optimized for **SvelteKit** and **Next.js**, but works well with modern
JavaScript and TypeScript projects such as **Node.js, Nuxt, and Vue**.

![CI](https://github.com/chrilleweb/dotenv-diff/actions/workflows/ci.yml/badge.svg)
[![npm version](https://img.shields.io/npm/v/dotenv-diff.svg)](https://www.npmjs.com/package/dotenv-diff)
[![npm downloads](https://img.shields.io/npm/dt/dotenv-diff.svg)](https://www.npmjs.com/package/dotenv-diff)

---

## Why dotenv-diff?

- Ensure all required environment variables are defined before deploying
- Catch missing or misconfigured variables early in development
- Improve collaboration by keeping teams aligned on required variables
- Reduce the risk of committing sensitive data
- Scale easily for monorepos and multi-environment setups

---

## GitHub Actions Example

Run `dotenv-diff` in CI to validate environment variables automatically:

```yaml
- name: Check environment variables
  run: dotenv-diff --example .env.example
```

To compare against a different example file:

```bash
dotenv-diff --example .env.example.staging
```

If no `.env.example` file exists, run:

```bash
dotenv-diff
```

This scans the codebase but skips comparison.

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

## Automatic Fixes (`--fix`)

Automatically add missing variables to your `.env` file:

```bash
dotenv-diff --fix
```

### Example

1. Code uses `process.env.NEW_API_KEY`
2. Run `dotenv-diff --fix`
3. Tool adds `NEW_API_KEY=` to `.env`

---

## Strict Mode

Treat warnings as errors (useful for CI):

```bash
dotenv-diff --strict
```

---

## Framework-Specific Warnings

When using **SvelteKit** or **Next.js**, `dotenv-diff` warns about incorrect usage.

Example warning:

```bash
Environment variable usage issues:
  - PUBLIC_URL (src/routes/+page.ts:1)
    → Variables accessed through import.meta.env must start with "VITE_"
```

---

## Detect Secrets in `.env.example`

`dotenv-diff` scans example files for potential secrets:

```bash
Potential real secrets found in .env.example:
  - API_KEY = "sk_test_..." → Matches known provider pattern [high]
```

---

## Logging Environment Variables

Detect accidental logging of sensitive values:

```js
console.log(process.env.API_KEY);
```

This triggers a warning.

---

## Ignore Specific Warnings

Ignore specific lines using comments:

```js
const secret = "https://example.com"; // dotenv-diff-ignore
```

---

## Health Score

Provides an overall score based on:
- Missing variables
- Potential secrets
- Naming conventions
- Logged variables
- Unused variables
- Framework-specific rules

---

## Expiration Warnings

Add expiration metadata to variables:

```bash
# @expire 2025-12-31
API_TOKEN=
```

---

## Inconsistent Naming Warnings

Warns about inconsistent keys like `APIKEY` vs `API_KEY`.

Disable via config:

```json
"inconsistentNamingWarnings": false
```

---

## t3-env Integration

Validates usage against t3-env schemas.

Disable if needed:

```json
"t3env": false
```

---

## Show / Hide Output Options

Disable unused variables list:

```bash
dotenv-diff --no-show-unused
```

Disable statistics:

```bash
dotenv-diff --no-show-stats
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

## Automatically Create Missing Files

```bash
dotenv-diff --compare --yes
```

---

## Exit Codes

- `0` → No errors
- `1` → Errors found (or warnings in strict mode)

---

## 🤝 Contributing

Issues and pull requests are welcome.  
For large changes, please open an issue first.

---

## License

Licensed under the [MIT](LICENSE) license.

Created by [chrilleweb](https://github.com/chrilleweb)
