---
'dotenv-diff': patch
---

fix `@expire` dates with impossible calendar values (e.g. `2024-13-45`, `2024-02-30`) being silently rolled over into a valid but wrong date, producing a bogus days left count. Such dates are now rejected and the key is skipped.
