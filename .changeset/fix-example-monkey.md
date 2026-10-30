---
'dotenv-diff': patch
---

fix: auto-generated `.env.example` no longer copies non-key lines, such as the body of a multi-line quoted value (e.g. a PEM private key)
