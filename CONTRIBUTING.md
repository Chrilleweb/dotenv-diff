# Contributing

Thanks for your interest in contributing to dotenv-diff! Contributions of all kinds are welcome — code, documentation, ideas, and feedback.

## Getting Started

1. Fork the repository
2. Clone your fork
3. Install pnpm: `npm install -g pnpm`
4. Install dependencies: `pnpm install`
5. Make your changes
6. Run tests: `pnpm run test`
7. Commit and push your changes
8. Open a pull request

## Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/) for automatic versioning and changelog generation.

**Format:**

```text
<type>[optional scope]: <description>

[optional body]
```

**Types:**

- `feat:` - New feature (triggers minor version bump)
- `fix:` - Bug fix (triggers patch version bump)
- `perf:` - Performance improvement
- `revert:` - Revert a previous commit
- `docs:` - Documentation only
- `style:` - Code style changes (formatting, missing semi-colons, etc.)
- `chore:` - Maintenance, tooling, refactors
- `refactor:` - Code restructuring
- `test:` - Adding or updating tests
- `ci:` - CI / workflow changes

**Examples:**

```bash
feat: add json output support
fix: handle empty env file
docs: update README usage section
chore: refactor parser internals
```

**Breaking changes** (triggers major version bump):

```bash
feat!: change CLI output format
```
or

```bash
feat: change CLI output format

BREAKING CHANGE: The CLI output format has changed and is not backward compatible.
```

This will trigger a major release.

## Guidelines

**Code Quality**

- Keep changes small and focused
- Follow the existing code style and project structure
- Write clear, descriptive commit messages

**Testing & Documentation**

- Add or update tests when introducing new behavior
- Update the README or documentation when relevant

**Communication**

- For larger changes or new features, open an issue first to discuss
- Avoid large refactors or breaking changes unless discussed beforehand

## Pull Requests

- Open your PR against the `main` branch
- Describe what you changed and why
- Link to related issues if applicable

## Questions or Ideas?

Feel free to open an issue for discussion — all feedback is welcome.

---

Thanks for contributing! 💚
