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

## Table of Contents

| Document | Description |
|---|---|
| [Capabilities](./capabilities.md) | What the scanner checks for and how it works |and rules |
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