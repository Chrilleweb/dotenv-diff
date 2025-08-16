# dotenv-diff

Easily compare your .env, .env.example, and other environment files (like .env.local, .env.production) to detect missing, extra, empty, or mismatched variables — and ensure they’re properly ignored by Git.

Or scan your codebase to find out which environment variables are actually used in your code, and which ones are not.

Optimized for JavaScript/TypeScript projects and frontend frameworks including Node.js, Next.js, Vite, SvelteKit, Nuxt, Vue, and Deno. Can also be used with other project types for basic .env file comparison.

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

## Scan your codebase for environment variable usage

```bash
dotenv-diff --scan-usage
``` 
This scans your entire codebase to detect which environment variables are actually used in the code — and compare them against your `.env` file(s).

## CI/CD integration with `--ci` option
You can scan and compare against specific environment file, eg. `.env.example`
This is useful for CI/CD pipelines to ensure that the environment variables used in your code match those defined in your `.env.example` file.

Use the `--ci` flag for automated environments. This enables strict mode where the tool exits with code 1 on any issues, making it perfect for CI/CD pipelines.

And the `--example` option allows you to specify which `.env.example` file to compare against.

### Use it in Github Actions:

```yaml
- name: Check environment variables
  run: dotenv-diff --scan-usage --example .env.example --ci
```

You can also change the comparison file by using the `--example` flag to point to a different `.env.example` file. 

```bash
dotenv-diff --scan-usage --example .env.example.staging --ci
```

## Show unused variables

Use `--show-unused` together with `--scan-usage` to list variables that are defined in `.env` but never used in your codebase:
```bash
dotenv-diff --scan-usage --show-unused
```
This will show you which variables are defined in your `.env` file but not used in your codebase. This helps you clean up unnecessary environment variables.

## Show scan statistics

```bash
dotenv-diff --show-stats
```
This will display statistics about the scan, such as the number of files scanned, variables found, and any unused variables. It provides a quick overview of your environment variable usage.

## include or exclude specific files for scanning

You can specify which files to include or exclude from the scan using the `--include` and `--exclude` options:

```bash
dotenv-diff --scan-usage --include '**/*.js,**/*.ts' --exclude '**/*.spec.ts'
```

By default, the scanner looks at JavaScript, TypeScript, Vue, and Svelte files.
The --include and --exclude options let you refine this list to focus on specific file types or directories.

### Override with `--files`

If you want to completely override the default include/exclude logic (for example, to also include test files), you can use --files:
```bash
dotenv-diff --scan-usage --files '**/*.js'
```
This will only scan the files matching the given patterns, even if they would normally be excluded.

## Optional: Check values too

```bash
dotenv-diff --check-values
```

When using the `--check-values` option, the tool will also compare the actual values of the variables in `.env` and `.env.example`. It will report any mismatches found and it also compares values if .env.example defines a non-empty expected value.

## Duplicate key warnings

`dotenv-diff` warns when a `.env*` file contains the same key multiple times. The last occurrence wins. Suppress these warnings with `--allow-duplicates`.

## Only show specific categories

Use the `--only` flag to restrict the comparison to specific categories. For example:

```bash
dotenv-diff --only missing,extra
```
This will only show missing and extra keys, ignoring empty, mismatched, duplicate keys and so on.

## Ignore specific keys

Exclude certain keys from the comparison using `--ignore` for exact names or `--ignore-regex` for patterns:

```bash
dotenv-diff --ignore API_KEY,SESSION_ID
dotenv-diff --ignore-regex '^SECRET_'
dotenv-diff --ignore API_KEY --ignore-regex '^SECRET_'
```

Ignored keys are removed from all warnings and do not affect the exit code.

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