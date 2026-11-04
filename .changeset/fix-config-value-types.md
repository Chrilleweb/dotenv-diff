---
'dotenv-diff': patch
---

fix: values in `dotenv-diff.config.json` are now type checked. A value of the wrong type (e.g. `"strict": "yes"` or `"ignore": 123`) is reported on stderr with the expected and received type and is ignored, instead of silently becoming `false` or `"123"`
