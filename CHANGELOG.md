# Changelog

<!-- changesets: chilly-windows-tease.md,docker-compose-usage.md,giant-foxes-boil.md,real-pans-cry.md -->
## 2026-07-17

### Highlights
- fix secret detector false warnings
- fix: count docker-compose `${VAR}` interpolation as usage to avoid false "unused"
- add default exclude keys regex
- fix false warning with jsx secret detector

### Package Releases
- dotenv-diff: patch

### Full Changelog
Package | Release type
--- | ---
dotenv-diff | patch

<!-- changesets: config-loader-unused.md,fuzzy-typo-suggestions.md,monorepo-nested-example.md,secret-value-shape-gate.md,vite-loadenv-pattern-label.md -->
## 2026-07-16

### Highlights
- Stop flagging config loader variables as unused.
- Add "did you mean" typo suggestions for missing keys.
- Support nested `.env.example` files in monorepos.
- Fix secret detector for false positives
- Label Vite `loadEnv(...)` usage with the new `"vite"` pattern instead of mislabeling it `"sveltekit"`.

### Package Releases
- dotenv-diff: patch
- dotenv-diff: minor

### Full Changelog
Package | Release type
--- | ---
dotenv-diff | patch
dotenv-diff | minor

<!-- changesets: node-22-minimum.md,secret-url-literal-false-positive.md -->
## 2026-07-06

### Highlights
- drop support for Node.js 20 - minimum supported version is now Node.js 22
- Fix false positive where URL literals are detected as secrets.

### Package Releases
- dotenv-diff: major
- dotenv-diff: patch

### Full Changelog
Package | Release type
--- | ---
dotenv-diff | major
dotenv-diff | patch

<!-- changesets: matrix-comparison.md,ripe-ducks-flash.md -->
## 2026-06-28

### Highlights
- add --matrix flag to compare 3+ env files side-by-side as a key-presence matrix, auto-discovering all .env\* files when none are given
- added first class support for nuxt

### Package Releases
- dotenv-diff: minor

### Full Changelog
Package | Release type
--- | ---
dotenv-diff | minor

<!-- changesets: spicy-experts-own.md -->
## 2026-06-23

### Highlights
- add .env.schema to default env candidates

### Package Releases
- dotenv-diff: patch

### Full Changelog
Package | Release type
--- | ---
dotenv-diff | patch

<!-- changesets: floppy-carrots-cough.md -->
## 2026-06-08

### Highlights
- updated commander dependency

### Package Releases
- dotenv-diff: patch

### Full Changelog
Package | Release type
--- | ---
dotenv-diff | patch

<!-- changesets: cyan-plants-stand.md,metal-houses-pull.md -->
## 2026-05-29

### Highlights
- fix no-env prompt file selection and filename display
- add --baseline flag to suppress known issues

### Package Releases
- dotenv-diff: patch
- dotenv-diff: minor

### Full Changelog
Package | Release type
--- | ---
dotenv-diff | patch
dotenv-diff | minor

<!-- changesets: bright-parrots-start.md,little-dolls-walk.md,polite-pants-cheer.md -->
## 2026-05-26

### Highlights
- adjustet --explain ui
- detects dot notation when line break appears after process.env
- prevent extra blank line when adding missing keys to empty .env files

### Package Releases
- dotenv-diff: patch

### Full Changelog
Package | Release type
--- | ---
dotenv-diff | patch

<!-- changesets: odd-vans-glow.md -->
## 2026-05-24

### Highlights
- feat: --explain <key> to show a detailed breakdown of a single environment varaible

### Package Releases
- dotenv-diff: minor

### Full Changelog
Package | Release type
--- | ---
dotenv-diff | minor

<!-- changesets: bold-stamps-fall.md,olive-rabbits-design.md,sparkly-wombats-rush.md,sweet-kings-tease.md,thin-points-pump.md -->
## 2026-05-18

### Highlights
- added bench and .history to default exclude patterns
- added .env.development to common environment files
- added form as an harmless attribute for secret detectors
- fixed ui bug for --list-all flag
- missing warning will now only warn first issue instead of all usages

### Package Releases
- dotenv-diff: patch

### Full Changelog
Package | Release type
--- | ---
dotenv-diff | patch

<!-- changesets: fine-facts-dress.md,slow-buttons-grab.md,solid-frogs-sing.md -->
## 2026-05-13

### Highlights
- does not include default excludes keys to list-all flag
- trimmed context for json output
- added SLOW_MO to default exclude list

### Package Releases
- dotenv-diff: patch

### Full Changelog
Package | Release type
--- | ---
dotenv-diff | patch

<!-- changesets: gentle-sheep-feel.md -->
## 2026-05-04

### Highlights
- added --list-all flag to view all environment variables found in codebase

### Package Releases
- dotenv-diff: minor

### Full Changelog
Package | Release type
--- | ---
dotenv-diff | minor

<!-- changesets: three-tools-attack.md -->
## 2026-04-24

### Highlights
- fixed false warning in sveltekit alias

### Package Releases
- dotenv-diff: patch

### Full Changelog
Package | Release type
--- | ---
dotenv-diff | patch

<!-- changesets: eighty-hornets-shop.md,fresh-eels-follow.md,spotty-owls-cheat.md,twelve-clouds-add.md -->
## 2026-04-23

### Highlights
- fix env handle windows styled line endings
- fixed false warning an type=password
- fixed nested env path
- fixed warning on unsued dynamic sveltekit variables

### Package Releases
- dotenv-diff: patch

### Full Changelog
Package | Release type
--- | ---
dotenv-diff | patch

<!-- changesets: chilly-lands-dance.md,fair-places-care.md,huge-kings-make.md,kind-onions-invent.md,sunny-eyes-admire.md -->
## 2026-03-29

### Highlights
- added more patterns to DEFAULT_EXCLUDE_PATTERNS
- ignore minified lines for env usage
- removed warning on detecting http URLs
- improved source secret detection for JSX props
- added more default exclude keys

### Package Releases
- dotenv-diff: patch

### Full Changelog
Package | Release type
--- | ---
dotenv-diff | patch

<!-- changesets: common-ways-stare.md,cyan-states-fall.md,empty-squids-try.md,olive-carrots-share.md,quiet-news-spend.md,sparkly-places-allow.md,sunny-jeans-wish.md -->
## 2026-03-28

### Highlights
- added CI, GITHUB_ACTIONS and INIT_CWD to default ignore keys
- added TZ to default exclude keys
- fix false positive secret warnings on charset/alphabet strings
- replaced severity with reason for secret detection output
- made suspicious keys more loose
- skip minified files in secret detection
- fixed ui space issue if key is too long

### Package Releases
- dotenv-diff: patch

### Full Changelog
Package | Release type
--- | ---
dotenv-diff | patch

<!-- changesets: tough-hornets-hammer.md -->
## 2026-03-27

### Highlights
- fixed ui bug for framework warnings

### Package Releases
- dotenv-diff: patch

### Full Changelog
Package | Release type
--- | ---
dotenv-diff | patch

<!-- changesets: slimy-jokes-know.md,smart-planes-wash.md -->
## 2026-03-27

### Highlights
- fixed false warning in sveltekit config files
- sveltekit object destructering from env

### Package Releases
- dotenv-diff: patch

### Full Changelog
Package | Release type
--- | ---
dotenv-diff | patch

<!-- changesets: forty-zoos-sell.md,icy-beers-eat.md,late-sides-wonder.md,salty-doors-think.md,smooth-cats-guess.md,tough-radios-obey.md -->
## 2026-03-22

### Highlights
- Case sensitive for glob pattern fix
- removed extra space efter framework warnings
- fixed interactive prompt may run in non-TTY environments
- Setup vitest package
- Fixed expire date calculation may be off by one day due to timezone parsing
- added more label width

### Package Releases
- dotenv-diff: patch

### Full Changelog
Package | Release type
--- | ---
dotenv-diff | patch

<!-- changesets: brown-chicken-look.md -->
## 2026-03-18

### Highlights
- Added support for lint-staged

### Package Releases
- dotenv-diff: patch

### Full Changelog
Package | Release type
--- | ---
dotenv-diff | patch

<!-- changesets: long-squids-warn.md -->
## 2026-03-17

### Highlights
- Fixed readme links

### Package Releases
- dotenv-diff: patch

### Full Changelog
Package | Release type
--- | ---
dotenv-diff | patch

<!-- changesets: neat-bars-sleep.md,tangy-ideas-mate.md -->
## 2026-03-17

### Highlights
- Updated dependencies and release scripts for all packages.
- fixed preserve nested example paths

### Package Releases
- dotenv-diff: patch

### Full Changelog
Package | Release type
--- | ---
dotenv-diff | patch

Combined release notes for the monorepo. Internal @repo packages are excluded from this log.
