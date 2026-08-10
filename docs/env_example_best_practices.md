# Writing a Good `.env.example`

This page shows two versions of a `.env.example` file. Both are valid, but the second one is what `dotenv-diff` is suggesting as a best practice for your team.

## Minimal version

The bare minimum: every key your code uses, with empty or placeholder values.

```env
DATABASE_URL=
SMTP_HOST=
SMTP_PORT=587
PORT=3000
NODE_ENV=development
PUBLIC_API_URL=http://localhost:3000
PARTNER_API_TOKEN=
```

## Documented version

The same file, written so it's easier to understand for new contributors to the team.

```env
# Database connection string for your Postgres database
DATABASE_URL=

# SMTP host for sending emails
SMTP_HOST=

# SMTP port for sending emails
SMTP_PORT=587

# Port for your application to listen on
PORT=3000

# Node environment (development, production, etc.)
# @optional
NODE_ENV=development

# Public API URL is used to call our backend
PUBLIC_API_URL=http://localhost:3000

# Temporary token for the partner API sandbox — ask the integrations team for a new one
# @expire 2027-03-31
PARTNER_API_TOKEN=
```

Every key above is documented — so this file passes `dotenv-diff --comment-warnings`.

`PARTNER_API_TOKEN` also has an `@expire` annotation, so `dotenv-diff` warns you when the token is close to expiring — and fails the build when it has less than 7 days left. Note that the annotation on its own is not documentation: the real comment above it is what makes the key documented.


## See also

- [Comment Warnings](./comment_warnings.md) — what counts as a documented key
- [Expiration Warnings](./expiration_warnings.md) — `@expire` syntax and thresholds
