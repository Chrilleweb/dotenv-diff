---
'dotenv-diff': patch
---

fix: multi-line `dotenv-diff-ignore-start` / `-end` blocks now work in any comment syntax (`//`, `/* */`, `#`, `<!-- -->`) for both env usages and secrets, and env usages inside multi-line `/* */` comments are no longer reported
