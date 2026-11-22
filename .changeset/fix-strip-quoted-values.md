---
'dotenv-diff': patch
---

Strip matching surrounding quotes from `.env` values, so `KEY="x"` and `KEY=x` are treated as the same value. Previously `--check-values` reported a false value mismatch between a quoted and an unquoted value.
