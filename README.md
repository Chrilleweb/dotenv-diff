# dotenv-diff

Easily compare your .env, .env.example, and other environment files (like .env.local, .env.production) to detect missing, extra, empty, or mismatched variables — and ensure they’re properly ignored by Git.

[![npm version](https://img.shields.io/npm/v/dotenv-diff.svg)](https://www.npmjs.com/package/dotenv-diff)
[![npm downloads](https://img.shields.io/npm/dt/dotenv-diff.svg)](https://www.npmjs.com/package/dotenv-diff)

---

## Installation

```bash
# npm
npm install -g dotenv-diff

# yarn
yarn global add dotenv-diff

# pnpm
pnpm add -g dotenv-diff
```
## Usage

```bash
dotenv-diff
```
## What it checks
dotenv-diff will automatically compare all matching .env* files in your project against .env.example, including:
- `.env`
- `.env.local`
- `.env.production`
- Any other .env.* file

## Optional: Check values too

```bash
dotenv-diff --check-values
```

When using the `--check-values` option, the tool will also compare the actual values of the variables in `.env` and `.env.example`. It will report any mismatches found and it also compares values if .env.example defines a non-empty expected value.

## Duplicate key warnings

`dotenv-diff` warns when a `.env*` file contains the same key multiple times. The last occurrence wins. Suppress these warnings with `--allow-duplicates`.

## Output format in JSON

You can output the results in JSON format using the `--json` option:

```bash
dotenv-diff --json
```

## Compare specific files

Override the autoscan and compare exactly two files:

```bash
dotenv-diff --env .env.staging --example .env.example.staging
```

You can also fix only one side. For example, force a particular `.env` file and let the tool find the matching `.env.example`:

```bash
dotenv-diff --env .env.production
```

Or provide just an example file and let the tool locate the appropriate `.env`:

```bash
dotenv-diff --example .env.example.production
```

## CI usage

Run non-interactively in CI environments with:

```bash
dotenv-diff --ci     # never create files, exit 1 if required files are missing
dotenv-diff --yes    # auto-create missing files without prompts
```

You can also use `-y` as a shorthand for `--yes`.

## Automatic file creation prompts

If one of the files is missing, `dotenv-diff` will ask if you want to create it from the other:

- **`.env` missing** → prompts to create it from `.env.example`
- **`.env.example` missing** → prompts to create it from `.env` *(keys only, no values)*

This makes it quick to set up environment files without manually copying or retyping variable names.

## Also checks your .gitignore

`dotenv-diff` will warn you if your `.env` file is **not** ignored by Git.  
This helps prevent accidentally committing sensitive environment variables.

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or a pull request.

## License

MIT

### Created by [chrilleweb](https://github.com/chrilleweb)