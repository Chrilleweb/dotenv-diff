---
'dotenv-diff': patch
---

fix: a source file with a single long line (e.g. an inline SVG or base64 data URL) is no longer skipped as minified. Previously such files were silently excluded from the scan, so their env usages and hardcoded secrets were not reported. Files are now only skipped when they have a minified file name (`*.min.*`, `*.bundle.*`) or are large with a high average line length; long lines inside scanned files are still ignored individually
