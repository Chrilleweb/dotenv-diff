---
'dotenv-diff': patch
---

perf: lower memory usage when scanning large codebases. File contents are now only kept for files that use environment variables, instead of for every scanned file
