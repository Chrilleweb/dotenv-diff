# dotenv-diff Documentation

Welcome to the official documentation for `dotenv-diff`.

`dotenv-diff` scans your codebase for environment variable usage and compares it against your `.env` and/or `.env.example` files.

It helps you:

- Detect missing environment variables
- Detect unused variables in your `.env` files
- Prevent runtime crashes caused by undefined `process.env` usage
- Enforce consistent environment configuration across teams
- Apply framework-specific validation rules (SvelteKit, Next.js, etc.)

The tool is designed to be fast, CI-friendly, and safe to run in large projects and monorepos.

---

## Quick Start

Install:

```bash
npm install dotenv-diff
```

Run:

```bash
npx dotenv-diff
```

---

The extension recognises the following patterns:

```typescript
// Node.js – dot and bracket notation
process.env.MY_KEY
process.env["MY_KEY"]
process.env['MY_KEY']

// Node.js – destructuring
const { MY_KEY } = process.env
const { MY_KEY: alias, OTHER_KEY = "fallback" } = process.env

// Vite / import.meta
import.meta.env.MY_KEY
import.meta.env["MY_KEY"]
import.meta.env['MY_KEY']

// SvelteKit – dynamic (env object)
import { env } from '$env/dynamic/private';
import { env } from '$env/dynamic/public';
env.MY_KEY

// SvelteKit – static (named imports)
import { MY_KEY } from '$env/static/private';
import { MY_KEY } from '$env/static/public';
MY_KEY
```

Only `UPPER_CASE` key names are matched, which is the standard convention for environment variables.

Default scanned file types: .ts, .js, jsx, tsx, vue, .mjs, .cjs, .svelte

---

## Table of Contents

| Document | Description |
|---|---|
| [Configuration and Flags](./configuration_and_flags.md) | Full CLI/config reference for options and behavior |
| [Expiration Warnings](./expiration_warnings.md) | How `@expire` annotations work and strict mode integration |
| [Ignore Comments](./ignore_comments.md) | Suppress false positives with inline/block ignore markers |
| [Monorepo Support](./monorepo_support.md) | Scan shared packages and cross-folder usage in monorepos |
| [Git Hooks and CI/CD](./git_hooks_ci.md) | Integrate dotenv-diff with Husky, lint-staged, and GitHub Actions |
| [Framework Warnings (Index)](./frameworks/index.md) | Framework detection and links to supported framework rules |
| [SvelteKit warnings](./frameworks/sveltekit_warnings.md) | SvelteKit-specific env validation rules |
| [Next.js warnings](./frameworks/nextjs_warnings.md) | Next.js-specific env validation rules |

---

## Quick links

- [Issue Tracker](https://github.com/Chrilleweb/dotenv-diff/issues)
- [CHANGELOG](../CHANGELOG.md)