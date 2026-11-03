---
'dotenv-diff': patch
---

fix: `dotenv-diff.config.json` is now validated. Unknown keys are reported on stderr with a "did you mean" hint for likely typos (e.g. `ignoreRegexp` → `ignoreRegex`) and are ignored. A config file that is not a JSON object is reported as a config error, and an invalid config file now exits with code 1 in `--ci` mode
