# SvelteKit warnings

`dotenv-diff` includes SvelteKit-specific rules for invalid or unsafe environment variable usage.

This page documents the exact warning behavior currently implemented.

## 1 `import.meta.env` must use `VITE_` prefix

```ts
import.meta.env.PUBLIC_URL
```

Warning:

`Variables accessed through import.meta.env must start with "VITE_"`

Correct usage:

```ts
import.meta.env.VITE_PUBLIC_URL
```

## 2 `process.env` should only be used in server files

```ts
process.env.VITE_SECRET
```

Warning:

`process.env should only be used in server files`

## 3 `$env/dynamic/private` cannot be used in client-side code

```svelte
<script lang="ts">
  import { env } from '$env/dynamic/private';
  console.log(env.SECRET_KEY);
</script>
```

Warning:

`$env/dynamic/private cannot be used in client-side code`

## 4 `$env/dynamic/private` variables must not start with `PUBLIC_`

```ts
import { env } from '$env/dynamic/private';
console.log(env.PUBLIC_API_URL);
```

Warning:

`$env/dynamic/private variables must not start with "PUBLIC_"`

## 5 `$env/dynamic/public` variables must start with `PUBLIC_`

```ts
import { env } from '$env/dynamic/public';
console.log(env.API_URL);
```

Warning:

`$env/dynamic/public variables must start with "PUBLIC_"`

## 6 `$env/static/private` variables must not start with `PUBLIC_`

```ts
import { PUBLIC_KEY } from '$env/static/private';
```

Warning:

`$env/static/private variables must not start with "PUBLIC_"`

## 7 `$env/static/private` cannot be used in client-side code

```svelte
<script lang="ts">
  import { SECRET_KEY } from '$env/static/private';
</script>
```

Warning:

`$env/static/private variables cannot be used in client-side code`

## 8 `$env/static/public` variables must start with `PUBLIC_`

```ts
import { API_URL } from '$env/static/public';
```

Warning:

`$env/static/public variables must start with "PUBLIC_"`

## 9 Sensitive-looking `PUBLIC_` / `VITE_` names trigger exposure warnings

If a client-exposed name contains `SECRET`, `PRIVATE`, or `PASSWORD`, a warning is produced.

```svelte
<script lang="ts">
  import { env } from '$env/dynamic/public';
  console.log(env.PUBLIC_SECRET_PASSWORD);
</script>
```

Warning:

`Potential sensitive environment variable exposed to the browser`

## Summary of rules

- `import.meta.env` → must use `VITE_*`
- `process.env` → server files only
- `$env/dynamic/private` → server-only, never `PUBLIC_*`
- `$env/dynamic/public` → must use `PUBLIC_*`
- `$env/static/private` → server-only, never `PUBLIC_*`
- `$env/static/public` → must use `PUBLIC_*`
- Sensitive client-exposed names (`PUBLIC_*`/`VITE_*`) → warning

## Best practices

- Use `PUBLIC_*` only for values intended for the browser
- Use `VITE_*` only via `import.meta.env`
- Keep private variables in server-only code
- Never expose secrets via `PUBLIC_*` or `VITE_*`