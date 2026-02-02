# dotenv-diff

Scan your entire codebase to detect every environment variable reference. It helps you catch missing, unused, duplicated, and misused variables early, before they cause runtime errors.

First-class support for SvelteKit and Next.js. Also works well in modern JavaScript/TypeScript projects and frameworks like Node.js, Nuxt, and Vue — or any other setup where you want reliable .env file comparison.

[![Coverage Status](https://codecov.io/gh/Chrilleweb/dotenv-diff/branch/main/graph/badge.svg)](https://codecov.io/gh/Chrilleweb/dotenv-diff)
[![npm version](https://img.shields.io/npm/v/dotenv-diff.svg)](https://www.npmjs.com/package/dotenv-diff)
[![npm downloads](https://img.shields.io/npm/dt/dotenv-diff.svg)](https://www.npmjs.com/package/dotenv-diff)

---

### Warnings & errors detection
![Demo](./docs/assets//demo1.gif)

### Clean / successful scan
![Successful Scan](./docs/assets//success1.png)

---

## Why dotenv-diff?

- Ensure all required environment variables are defined before deploying
- Catch missing or misconfigured variables early in development
- Improve collaboration by keeping teams aligned on required variables
- Reduce the risk of committing sensitive data
- Scale easily for monorepos and multi-environment setups

---

## Configuration (`--init`)

Generate a default configuration file:

```bash
dotenv-diff --init
```

→ See [Configuration Documentation](https://dotenv-diff-docs.vercel.app/configuration) for more details.

---

## Git hooks and CI/CD Integration

Easily integrate dotenv-diff into your Git hooks or CI/CD pipelines to enforce environment variable consistency.

→ See [Git Hooks Documentation](https://dotenv-diff-docs.vercel.app/hooks-ci) for more details.

## Framework-Specific Warnings

In SvelteKit and Next.js projects, dotenv-diff detects framework-specific
environment variable misuses.

Example warning:

```bash
Framework issues (Sveltekit):
  - PUBLIC_URL (src/routes/+page.ts:1)
    → Variables accessed through import.meta.env must start with "VITE_"
```

→ See [Framework Documentation](https://dotenv-diff-docs.vercel.app/sveltekit) for more details.

## Ignore Comments 

You can ignore specific environment variable warnings by adding comments in your code. For example:

```javascript
const apiKey = process.env.API_KEY; // dotenv-diff-ignore
```

This is helpful when you know a specific warning is safe in your source code.

→ See [Ignore Comments Documentation](https://dotenv-diff-docs.vercel.app/ignore-comments) for more details.

---

## Expiration Warnings

Add expiration metadata to your environment variables to get warnings when they are about to expire. For example, in your `.env` file:

```bash
# @expire 2025-12-31
API_TOKEN=
```

→ See [Expiration Documentation](https://dotenv-diff-docs.vercel.app/expire-warnings) for more details.

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

→ See [Monorepo Documentation](https://dotenv-diff-docs.vercel.app/monorepo) for more details.

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
→ See [CONTRIBUTING](CONTRIBUTING.md) for details.

---

## License

Licensed under the [MIT](LICENSE) license.

Created by [chrilleweb](https://github.com/chrilleweb)
