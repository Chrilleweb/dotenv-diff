---
'dotenv-diff': patch
---

fix: `"driftWarnings": false` in `dotenv-diff.config.json` is no longer ignored. CLI flag defaults no longer override config file values, and `--drift-warnings` can now be passed to re-enable drift warnings when the config file disables them
