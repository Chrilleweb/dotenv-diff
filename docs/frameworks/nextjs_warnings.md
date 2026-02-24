# Next.js warnings

`dotenv-diff` includes Next.js-specific rules to catch unsafe or invalid environment variable usage.

This page reflects the currently implemented rule behavior.

## 1 Client code must use `NEXT_PUBLIC_` variables only

When a file is treated as client code (`"use client"` or Pages Router client files), non-`NEXT_PUBLIC_` variables trigger a warning.

```tsx
"use client";
console.log(process.env.SECRET_TOKEN);
```

Warning:

`Server-only variable accessed from client code`

## 2 `import.meta.env` is not supported in Next.js

```ts
console.log(import.meta.env.PRIVATE_KEY);
```

Warning:

`Next.js uses process.env, not import.meta.env (Vite syntax)`

## 3 Sensitive-looking `NEXT_PUBLIC_` names trigger exposure warnings

If a `NEXT_PUBLIC_` variable contains `SECRET`, `PRIVATE`, or `PASSWORD`, a warning is produced.

```ts
console.log(process.env.NEXT_PUBLIC_SECRET_PASSWORD);
```

Warning:

`Potential sensitive environment variable exposed to the browser`

## What is allowed

Server files (for example API routes and other server-only code) can use private environment variables without framework warnings.

## Summary of rules

- Client code → only `NEXT_PUBLIC_*`
- `import.meta.env` → not valid in Next.js
- Sensitive names in `NEXT_PUBLIC_*` → warning

## Best practices

- Use `NEXT_PUBLIC_*` only for browser-safe values
- Keep secrets in server-only code paths
- Do not use `import.meta.env` in Next.js projects