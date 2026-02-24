# dotenv-diff Documentation

Welcome to the official documentation for `dotenv-diff`.

This section gives you a quick overview of available guides and where to find framework-specific rules.

---

## Quick Start

Install:

```bash
npm install dotenv-diff
```

Run:

```bash
npx dotenv-diff --example .env.example
```

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