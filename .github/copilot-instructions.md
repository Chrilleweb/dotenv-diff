# Copilot Instructions for dotenv-diff

## Repository Summary

**dotenv-diff** is a lightweight CLI tool and Node.js library that compares `.env` and `.env.example` files to detect missing, extra, empty, or mismatched environment variables. The tool helps developers maintain consistency between their environment configuration and example files.

## High-Level Repository Information

- **Project Type**: CLI tool and NPM library
- **Languages**: TypeScript (source), JavaScript (compiled output)
- **Target Runtime**: Node.js >=14.0.0
- **Module System**: ESM (ES Modules) - `"type": "module"` in package.json
- **Package Manager**: npm
- **Repository Size**: Small (~200 lines of code, 22 files)
- **Dependencies**: chalk (colored output), commander (CLI parsing)
- **Dev Dependencies**: TypeScript 5.2.0+, Vitest (testing), @types/node

## Build and Validation Instructions

### Prerequisites
- Node.js >=14.0.0 (tested with v20.19.4)
- npm 10+ (tested with 10.8.2)

### Bootstrap and Build Process

**ALWAYS run these commands in sequence for a clean build:**

1. **Install dependencies** (required before any other commands):
   ```bash
   npm install
   ```
   - Takes 8-26 seconds typically
   - Creates `node_modules/` and `package-lock.json`

2. **Build the project**:
   ```bash
   npm run build
   ```
   - Compiles TypeScript to JavaScript in `dist/` folder
   - Fast compilation (~1-2 seconds)
   - Must be run after any source code changes before testing CLI

3. **Run tests**:
   ```bash
   npm test
   ```
   - Runs Vitest test suite (~280ms)
   - All 9 tests should pass
   - No build required before testing (tests import TypeScript directly)

### Development Commands

- **Watch mode for tests**:
  ```bash
  npm run dev
  ```
  - Runs tests in watch mode with Vitest
  - Automatically re-runs tests when files change
  - Press `q` to quit, `h` for help

- **Run CLI tool**:
  ```bash
  npm start [-- options]
  ```
  - Requires both `.env` and `.env.example` files in working directory
  - Examples: `npm start`, `npm start -- --check-values`
  - Will fail with exit code 1 if required files are missing

### Clean Build Process

If you encounter issues, use this clean build sequence:
```bash
rm -rf dist node_modules package-lock.json
npm install
npm run build
npm test
```

### Testing and Validation

**Creating test .env files for CLI testing:**
```bash
# Create test files
echo "TEST=example_value" > .env
echo "TEST=TEST" > .env.example

# Test basic functionality
npm start

# Test value checking
echo "TEST=different_value" > .env
npm start -- --check-values
```

**Exit codes:**
- 0: Success or warnings only
- 1: Missing keys found (critical errors)

## Project Layout and Architecture

### Source Code Structure
```
src/
├── cli.ts          # CLI entry point with shebang, uses Commander.js
├── index.ts        # Library exports (parseEnvFile, diffEnv, DiffResult)
└── lib/
    ├── diffEnv.ts  # Core comparison logic and types
    └── parseEnv.ts # Environment file parser
```

### Key Files and Locations

**Configuration Files:**
- `package.json` - Project config, scripts, dependencies
- `tsconfig.json` - TypeScript compiler settings (ES2022 target, ESNext modules)
- `.gitignore` - Excludes `/node_modules`, `/dist`, `/.env`

**Source Files:**
- `src/cli.ts` - CLI interface using Commander.js, colored output with Chalk
- `src/index.ts` - Library exports (2 lines, re-exports from lib/)
- `src/lib/diffEnv.ts` - Core logic: `diffEnv()` function and `DiffResult` type
- `src/lib/parseEnv.ts` - Parser: `parseEnvFile()` function for reading .env files

**Test Files:**
- `test/diffEnv.test.ts` - Single test file with 9 comprehensive test cases
- Uses Vitest testing framework
- Tests cover: missing keys, extra keys, value mismatches, edge cases

**Build Output:**
- `dist/` - Generated JavaScript files (not in source control)
- `dist/cli.js` - Main CLI executable (has shebang)
- `dist/index.js` - Library entry point
- `dist/lib/` - Compiled library modules
- All `.d.ts` files generated for TypeScript definitions

**Static Assets:**
- `public/image.png` - Terminal screenshot for README

**Example Files:**
- `.env.example` - Contains `TEST=TEST`
- `.env.production` - Empty file

### Architecture Details

**CLI Architecture:**
- Entry point: `dist/cli.js` (built from `src/cli.ts`)
- Uses Commander.js for argument parsing
- Single option: `--check-values` for value comparison
- Colored output using Chalk library
- Reads `.env` and `.env.example` from current working directory

**Library Architecture:**
- **parseEnvFile()**: Reads and parses .env files, ignores comments and empty lines
- **diffEnv()**: Compares two parsed env objects, returns structured differences
- **DiffResult type**: `{ missing: string[], extra: string[], valueMismatches: Array }`

**Module System:**
- Uses ESM imports/exports throughout
- File extensions required in imports (`.js` for compiled output)
- No CommonJS compatibility

### Dependencies and Build Tools

**Runtime Dependencies:**
- `chalk@^5.4.1` - Terminal colors (ESM only)
- `commander@^14.0.0` - CLI argument parsing

**Development Dependencies:**
- `typescript@^5.2.0` - TypeScript compiler
- `vitest@^3.2.0` - Testing framework
- `@types/node@^20.0.0` - Node.js type definitions

**No Linting/Formatting:**
- No ESLint, Prettier, or other code quality tools configured
- No pre-commit hooks or Git hooks
- No CI/CD pipelines or GitHub Actions

### Validation and CI/CD

**No automated validation pipelines exist** - this repository has:
- No `.github/workflows/` directory
- No GitHub Actions
- No pre-commit hooks
- No linting or formatting tools

**Manual validation steps:**
1. Build successfully: `npm run build`
2. All tests pass: `npm test`
3. CLI functions correctly with test files
4. TypeScript compilation produces valid JavaScript

### NPM Package Configuration

**Published to npm as `dotenv-diff`:**
- Binary: `dotenv-diff` → `dist/cli.js`
- Main entry: `dist/index.js`
- TypeScript definitions: `dist/index.d.ts`
- Includes only essential files in package

### Working with the Codebase

**For new features:**
1. Add TypeScript source to `src/`
2. Add tests to `test/` using Vitest
3. Update exports in `src/index.ts` if needed
4. Build and test before committing

**For bug fixes:**
1. Identify issue in source files
2. Create failing test first (if possible)
3. Fix the issue in TypeScript source
4. Ensure all tests pass

**File naming conventions:**
- Source files: `.ts` extension
- Test files: `.test.ts` suffix
- Compiled output: `.js` with corresponding `.d.ts`

### Important Notes

- **Always install dependencies first** - nothing works without `npm install`
- **TypeScript source is authoritative** - never edit files in `dist/`
- **ESM imports require file extensions** in compiled output
- **CLI requires both .env files** to exist in working directory
- **No async operations** - all file I/O is synchronous
- **Simple string-based parsing** - no complex .env format support

Trust these instructions and only search for additional information if something is incomplete or incorrect. The repository is small and well-structured, making it easy to navigate and modify.