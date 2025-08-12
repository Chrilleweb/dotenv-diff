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
