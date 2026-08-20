---
'dotenv-diff': patch
---

fix: drop the unused `kind` field from `SecretFinding`, never used and caused a bug where a secret finding could be duplicated
