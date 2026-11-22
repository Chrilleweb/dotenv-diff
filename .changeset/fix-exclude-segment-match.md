---
'dotenv-diff': patch
---

Fix exclude patterns matching as raw substrings, which silently skipped source files such as `src/latest/`, `src/workbench/`, `rebuild.ts` or `contest.ts` because their path contained a default exclude like `test`, `bench` or `build`. Plain names now match whole path segments, file name fragments like `.test.` or `.d.ts` match within the file name, and globs work as before.
