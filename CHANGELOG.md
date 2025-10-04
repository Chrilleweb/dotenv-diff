# Changelog
All notable changes to this project will be documented in this file.
This project follows [Keep a Changelog](https://keepachangelog.com/) and [Semantic Versioning](https://semver.org/).

## [Unreleased]
### Added
- 

### Changed
- 

### Fixed
-

## [2.2.8] - 2025-09-30
### Added
- Fix .env is not ignored by git when using --fix flag.

### Changed
- No breaking changes.

### Fixed
- Refactored codebase for better maintainability.

## [2.2.7] - 2025-09-28
### Added
- Added warning on .env not ignored by .gitignore on default.
- added `dotenv-diff-ignore` comment to ignore lines from secret detection.

### Fixed
- Fixed `--strict` error output to console when no warnings are found.

### Changed
- No breaking changes.
- Updated dependencies to latest versions.

## [2.2.6] - 2025-09-25
### Added
- Added `placeholder`, `127.0.0.1`, and `example` to `looksHarmless` secret detection rule.
- Added `HTTP URL detected` message to potential secrets output.

### Fixed
- Removed `All used environment variables are defined in {.env}` when there are no used variables found.

### Changed
- No breaking changes.

## [2.2.5] - 2025-09-18
### Added
- Updated README with `--strict` flag documentation.

### Fixed
- Fixed false positives for HTTPS URLs in SVG files and SVG namespace URLs.

### Changed
- No breaking changes.

## [2.2.4] - 2025-09-13
### Fixed
- Fixed found variable count did not show when there were missing variables in .env
- Will now not says "Found 2 unique environment variables in use" if there are found in commented out code.
- Fixed bug where it would say "no unused variables" if there where no found variables at all.

### Changed
- No breaking changes.

## [2.2.3] - 2025-09-08
### Added
- Warning for HTTPS URLs detected in codebase.
- Added duplicate key detection to codebase scanner.
- added `--strict` flag to enable strict mode (treat warnings as errors).
- duplicate key detection for `.env.example` files.

### Fixed
- Fixed issue with false warnings on secrets in certain edge cases.
- Updated README

### Changed
- No breaking changes.
- `--compare` feature coloring improved for better readability.
- added `duplicate` warnings to scan results.

## [2.2.2] - 2025-09-07
### Fixed
- Fixed issue where it would give a false warning on secrets with process.env
- Code cleanup.
- exclude `.svelte-kit` from codebase scan by default.
- Updated README

### Changed
- No breaking changes.

## [2.2.1] - 2025-09-06
### Changed
- tsconfig updates for improved type checking.
- Updated codebase for new tsconfig rules
- No breaking changes.

### Added
- Improved jsDocs for better code documentation.

## [2.2.0] - 2025-08-30
### Added
- `--compare` flag to enable comparison mode.
- `dotenv-diff` will now detect potential secrets in your codebase.

### Changed
- Default behavior is now **scan-usage** (you no longer need `--scan-usage`), but you can still use it for clarity.
- `--compare` flag is now required for all comparison operations.


## [2.1.7] - 2025-08-28
### Added
- gif to README file.

### Changed
- No breaking changes. Existing functionality remains intact.

## [2.1.6] - 2025-08-26
### fixed
- Fixed issue where prompts were disabled when using `--env` and `--example` flags.

## Changed
- No breaking changes. Existing functionality remains intact.

## [2.1.5] - 2025-08-25
### Added
- Added `--no-color` option to disable colored output.

### Changed
- No breaking changes. Existing functionality remains intact.

## [2.1.4] - 2025-08-19
### Added
- the `--fix` flag to automatically fix common issues:
  - Remove duplicate keys (keeping the last occurrence).
  - Add missing keys from the example file with empty values.

### Changed
- No breaking changes. Existing functionality remains intact.

## [2.1.3] - 2025-08-19
### Added
- Added `.sveltekit` and `_actions` to default exclude patterns in codebase scanner.

### Changed
- No breaking changes. Existing functionality remains intact.

### Fixed
- Fixed issue where `--include-files` and `--exclude-files` were not properly documented in README.

## [2.1.2] - 2025-08-16
### Changed
- Updated README with Turborepo usage example.

## [2.1.1] - 2025-08-16
### Added
- `--files` option to **completely override** the default file patterns.  
  Useful for including files that are normally excluded (e.g. `*.test.js`).

### Changed
- Clarified behavior of `--include-files`: now explicitly extends the default patterns instead of replacing them.  
- Updated README with usage examples for `--files`, `--include-files`, and `--exclude-files`.

## [2.1.0] - 2025-08-15
### Added
- `--ci` option for non-interactive mode in CI environments.

### Changed
- No breaking changes. Existing functionality remains intact.

## [2.0.0] - 2025-08-14
### Added
- `--scan-usage` option to scan codebase for environment variable usage.
- `--include-files` and `--exclude-files` options to specify which files to include or exclude from the scan.
- `--show-unused` option to display variables defined in `.env` but not used in code.
- `--show-stats` option to display scan statistics.

### Changed
- No breaking changes. Existing functionality remains intact.

## [1.6.5] - 2025-08-13
### Added
- `--only` flag to restrict output to specific categories (e.g., `missing`, `extra`, `empty`, `mismatches`, `duplicates`, `gitignore`).

## [1.6.4] - 2025-08-12
### Added
- `--ignore` and `--ignore-regex` options to specify files or directories to ignore during comparison.

## [1.6.3] - 2025-08-11
### Added
- `--json` option to output results in JSON format. (Non-breaking)

## [1.6.2] - 2025-08-10
### Added
- Duplicate key detection for `.env*` files.
  - Prints warnings listing duplicate keys (last occurrence wins).
  - Suppress via `--allow-duplicates`.

### Changed
- No breaking changes. Exit codes and diff behavior unchanged.

## [1.6.1] - 2025-08-09
### Build
- Updated TypeScript configuration to include `bin` directory.
- Switched CLI path to `bin/dotenv-diff.js` for consistency.
- Refactored folder structure for better organization.

## [1.6.0] - 2025-08-08
### Added
- `--env` and `--example` for direct file comparison; autoscan overridden when both are provided.

## [1.5.0] - 2025-08-07
### Added
- Non-interactive modes: `--ci` and `--yes`.
