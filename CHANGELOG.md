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

## [2.4.1] - 2025-12-26

### Changed

- Added Example warings to JSON output of scan usage.
- Changed scan statistics name from "Total usages found" to "Total variables".

### Fixed

- Fixed nextjs framework rules bug where multiple warnings could be generated for the same usage.
- Fixed t3-env framework rules bug where multiple warnings could be generated for the same usage.
- Fixed false positive secret detection for certain harmless attribute keys in codebase scanner.

## [2.4.0] - 2025-12-26

### Changed

- Added spacing before missing example file message in scan usage output.
- Changed path display for print missing example file message to show only filename instead of full path.

### Fixed

- Fixed compare mode value mismatch count not showing in stats output if --check-values flag isn't used.
- Fixed t3-env integration not working as expected in some edge cases.
- Fixed nextjs framework validator not working as expected in some edge cases.

## [2.3.12] - 2025-12-18

### Added

- Added warnings count to scan usage stats.

### Changed

- Updated dependencies to latest versions.
- Moved `healthScore` further down on the console output for better visibility of issues.
- Removed used variables output from scan usage to reduce noise.
- Removed header output from scan usage to reduce noise.
- Shortened config file path in CLI output to show only the filename.
- Updated README documentation for better clarity.

### Fixed

- Fixed false positive secret detection for certain harmless attribute keys in codebase scanner.
- Fixed print fix bug

## [2.3.11] - 2025-12-13

### Changed

- Removed low severity secrets from codebase scanner results, because it made too much noise.

## [2.3.10] - 2025-12-11

### Added

- More jsDocs for better code documentation.
- t3-env integration to validate environment variable usage against T3 stack schema.

### Fixed

- Removed unused code for old --no-compare option.

## [2.3.9] - 2025-12-09

### Added

- Added expiration date warnings for environment variables in codebase scanner.
- Added inconsistent naming warnings for environment variables in codebase scanner.

### Changed

- Changed health score calculation weights for better accuracy.
- Removed CSP detection from codebase scanner, as it was causing false positives in some cases for backend frameworks.

## [2.3.8] - 2025-12-08

### Added

- Added variables not using uppercase letters warning to codebase scanner.
- Added health score feature to codebase scanner.

### Changed

- Removed --no-compare option from CLI and config file.
- Updated dependencies to latest versions.

### Fixed

- Fixed issue where show-stats and show-unused options were not working as expected in config file.

## [2.3.7] - 2025-12-03

### Added

- Added warning for environment variables logged to console in codebase scanner.

### Changed

- Updated dependencies to latest versions.

### Fixed

- Updated jsDocs for better code documentation.
- Updated some functions for better type safety.

## [2.3.6] - 2025-12-02

### Added

- Added strict mode handling for framework specific warnings.
- Added Next.js specific warnings to framework validator.

### Fixed

- Nameing convention fix in frameworkValidator.ts

## [2.3.5] - 2025-12-01

### Added

- Added more sveltekit specific warnings to codebase scanner.
- Added warning for potential secrets in .env.example file.

### Fixed

- Duration refactored for better code maintainability.

## [2.3.4] - 2025-11-05

### Fixed

- Fixed issue where CSP detection was not working as expected in some file types.

## [2.3.3] - 2025-11-30

### Added

- Added Content-Security-Policy (CSP) detection to codebase scanner.
- Warns if no CSP is found in HTML/JS/TS files.

### Changed

- No breaking changes.

## [2.3.2] - 2025-11-01

### Added

- Added duration output to scan statistics.
- Severity levels for secret findings: high, medium, low.

### Changed

- Updated dependencies to latest versions.
- Improved README documentation for clarity.
- No breaking changes.

## [2.3.1] - 2025-10-08

### Fixed

- Fixed dotenv-diff.config.json not found in monorepo root when running from apps.

## [2.3.0] - 2025-10-07

### Fixed

- Fixed issue where .env.example would be ignored by git when using --fix flag.

### Added

- HTML comments to ignore secret detection in HTML lines (e.g. `<!-- dotenv-diff-ignore -->`).
- Also ignore html sections with `<!-- dotenv-diff-ignore-start -->` and `<!-- dotenv-diff-ignore-end -->`.
- Added option to have a dotenv-diff.config.json file for configuration.
- ignoreUrls option to ignore specific URLs in secret detection. (e.g. `https://nomistake.com`).
- Added `--init` flag to create a sample config file.
- --no-compare flag to disable comparison mode in scan usage. and noCompare option in config file.

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
