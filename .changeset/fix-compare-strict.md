---
'dotenv-diff': patch
---

fix: `--strict` was ignored in `--compare` mode, so warnings like duplicate keys never failed the run
