# Nuxt warnings

`dotenv-diff` includes Nuxt-specific rules to catch unsafe or unreliable environment variable usage.

This page reflects the currently implemented rule behavior and targets Nuxt 3.

## Background

Nuxt exposes runtime configuration through `runtimeConfig` (private, server-only) and `runtimeConfig.public` (exposed to the client), accessed via `useRuntimeConfig()`.

In production, `.env` files are **not** read at runtime, and `process.env` is **not** populated in the browser. Environment variables only override runtime config when prefixed with `NUXT_` (private) or `NUXT_PUBLIC_` (public).

## 1 `process.env` in client/universal code

`process.env` is unreliable outside server code: it is not available in the browser, and `.env` files are not read at runtime in production.

```vue
<script setup lang="ts">
const key = process.env.API_SECRET; // ⚠️
</script>
```

Warning:

`process.env is not available in the browser; use useRuntimeConfig() instead`

## 2 Sensitive-looking `NUXT_PUBLIC_` names trigger exposure warnings

If a `NUXT_PUBLIC_` variable contains `SECRET`, `PRIVATE`, or `PASSWORD`, a warning is produced — these values are exposed to the browser.

```ts
process.env.NUXT_PUBLIC_API_SECRET;
```

Warning:

`Potential sensitive environment variable exposed to the browser`

## What is allowed

`process.env` is allowed in server-only contexts without framework warnings:

- The Nitro `server/` directory (`server/api`, `server/routes`, `server/middleware`, etc.)
- `.server.` suffixed files (for example `plugins/auth.server.ts`)
- `nuxt.config.{ts,js,mjs,cjs}` (where env vars feed `runtimeConfig`)

## Summary of rules

- `process.env` in client/universal code → use `useRuntimeConfig()`
- Sensitive names in `NUXT_PUBLIC_*` → warning

## Best practices

- Use `runtimeConfig` / `useRuntimeConfig()` instead of reading `process.env` directly in app code
- Only put browser-safe values under `runtimeConfig.public` / `NUXT_PUBLIC_*`
- Keep secrets in server-only code paths (`server/`, `.server.` files)
