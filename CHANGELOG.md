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
