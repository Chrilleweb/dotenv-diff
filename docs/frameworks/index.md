# dotenv-diff – Framework Warnings Documentation

This section explains which framework-specific environment variable are currently supported and how it works.

---

## Supported frameworks

- [SvelteKit warnings](./sveltekit_warnings.md)
- [Next.js warnings](./nextjs_warnings.md)

---

## Framework detection

dotenv-diff detects framework rules automatically from `package.json` in your current working directory.

E.g.

- If `@sveltejs/kit` is present, SvelteKit rules are enabled.
- If `next` is present, Next.js rules are enabled.
- If neither is detected, framework-specific warnings are skipped.

---
