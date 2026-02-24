# Git Hooks and CI/CD

`dotenv-diff` is a CLI-first tool and does not manage git hooks or CI workflows by itself.

Instead, it is built to integrate cleanly with your existing tooling, such as Husky pre-commit hooks and GitHub Actions.

## Using dotenv-diff as a pre-commit hook

Running `dotenv-diff` before each commit helps catch missing, unused, and misused environment variables early.

A common setup is Husky + lint-staged, where `dotenv-diff` runs automatically on commit.

## Running dotenv-diff in GitHub Actions

Use `dotenv-diff` in CI to validate environment variable consistency on pull requests.

This is especially useful to keep `.env.example` in sync with real usage in code.

### Example GitHub Action

`.github/workflows/dotenv-diff.yml`

```yaml
name: dotenv-diff

on: [pull_request]

jobs:
  env-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
      - run: npm ci
      - run: npx dotenv-diff --example .env.example --strict
```

## Why use this in hooks and CI

- Prevent commits that introduce undocumented environment variables
- Catch framework-specific env usage issues early
- Keep `.env.example` accurate across contributors and pull requests

## Best practices

- Use `--example` to validate against your reference file
- Use `--strict` in CI for fail-fast behavior on warnings
- Keep hook checks fast and predictable
- Pair with monorepo patterns (`--include-files`) where relevant

---
