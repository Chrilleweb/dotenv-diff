---
'dotenv-diff': minor
---

feat: detect Strapi's `env('KEY')` and `env.<cast>('KEY')` helper in config files that receive `env` as a destructured parameter (`({ env }) => ...`)
