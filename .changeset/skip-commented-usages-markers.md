---
'dotenv-diff': patch
---

fix env var usages being silently dropped from the scan when their line merely contained the substrings `<!--` or `-->`
