# Changelog

## 1.6.2

### Added
- Duplicate key detection for `.env*` files.
  - Prints warnings listing duplicate keys (last occurrence wins).
  - Suppress via `--allow-duplicates`.

### Changed
- No breaking changes. Exit codes and diff behavior unchanged.

## 1.6.1

### Added
- `--env` and `--example` for direct file comparison; autoscan overridden when both are provided.
- `--ci` and `--yes` non-interactive modes.

### Changed
- Updated TypeScript configuration to include `bin` directory.
- Changed CLI path to `bin/dotenv-diff.js` for consistency.
- Refactored folder structure for better organization.
## 1.6.0

### Added
- `--env` and `--example` for direct file comparison; autoscan overridden when both are provided.

## 1.5.0

### Added
- `--ci` and `--yes` non-interactive modes.
