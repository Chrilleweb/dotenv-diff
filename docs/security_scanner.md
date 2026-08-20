# Security Scanner

`dotenv-diff` scans your source files and your example file for hardcoded secrets using three complementary techniques.

## Table of Contents

- [Provider Pattern Matching](#1-provider-pattern-matching-high-severity)
- [Suspicious Key Name Detection](#2-suspicious-key-name-detection-medium-severity)
- [High-Entropy String Detection](#3-high-entropy-string-detection-medium--high-severity)
- [Example File Scanning](#example-file-scanning)
- [False Positive Protections](#false-positive-protections)
- [Suppressing False Positives](#suppressing-false-positives)

---

## 1. Provider Pattern Matching (high severity)

Detects known credential formats from popular providers:

| Provider | Example pattern |
|---|---|
| AWS access key | `AKIA` + 16 uppercase alphanumeric chars |
| AWS temporary key | `ASIA` + 16 uppercase alphanumeric chars |
| GitHub token | `ghp_` + 30+ alphanumeric chars |
| Stripe live secret | `sk_live_` + 24+ alphanumeric chars |
| Stripe test secret | `sk_test_` + 24+ alphanumeric chars |
| Google API key | `AIza` + 20+ alphanumeric chars |
| Google OAuth token | `ya29.` + alphanumeric chars |
| Firebase token | 21-char ID + `:` + 140-char token |
| JWT | Three base64url segments separated by `.` starting with `eyJ` |
| Twilio Account SID | `AC` + 32 hex chars |
| Ethereum address | `0x` + 40 hex chars |

---

## 2. Suspicious Key Name Detection (medium severity)

Flags literal string assignments where the variable or attribute name matches a sensitive pattern:

```
password, pass, secret, token, apikey, api_key, client_secret, access_token, access-token
```

Only triggers when all of the following are true:

- The value is **12+ characters** long
- The value does **not** contain spaces (space → likely a human-readable label, not a secret)
- The attribute name is **not** a known harmless UI prop (`label`, `placeholder`, `name`, `title`, `aria-label`, `type`, `autocomplete`, `inputmode`, `role`, `method`, `enctype`, `form`, etc.)
- The line does **not** read from an env accessor (`process.env`, `import.meta.env`, SvelteKit `$env/*`)
- The value is **not** a pure interpolation template (e.g. `` `${a}:${b}` ``)

---

## 3. High-Entropy String Detection (medium / high severity)

Uses [Shannon entropy](https://en.wikipedia.org/wiki/Entropy_(information_theory)) to detect randomly-generated secrets — strings that are statistically too random to be written by hand.

| String length | Entropy threshold | Severity |
|---|---|---|
| 24–47 chars | ≥ 0.85 (normalized) | medium |
| 48+ chars | ≥ 0.85 (normalized) | high |

> In test files (`*.spec.ts`, `*.test.ts`, `__tests__/`, `fixtures/`, etc.) the threshold is raised to **0.95** to reduce false positives.

Entropy is normalized against a 72-character alphabet, so the ceiling for a value of length *n* is `log2(n) / log2(72)`. A value shorter than **38 characters** therefore cannot reach 0.85 however random it looks, and one has to be close to fully distinct in its characters to land in the medium band at all. In practice almost every entropy finding is high severity.

The same three thresholds drive source files and example files, so a value is judged identically wherever it appears.

---

## Example File Scanning

The example file that documents your env file is scanned too — a real credential committed there is public to everyone who clones the repo. This runs on every scan; no flag is needed.

The file is found next to the one being scanned, using the same pairing as [`--compare`](./compare.md): `.env.example`, `.env-example`, `.env.sample` and `.env.template` all count, and a suffixed env file prefers its suffixed example (`.env.production` → `.env.example.production`).

Example files are expected to hold placeholders, so entries are skipped when the value:

- Is empty
- Equals `example` or `placeholder` (case-insensitive)
- Contains `your_` or `CHANGE_ME`
- Contains `<` (typical for `<your-value-here>` style templates)

Remaining values go through the same [provider patterns](#1-provider-pattern-matching-high-severity) and [entropy rules](#3-high-entropy-string-detection-medium--high-severity) as source files, and are reported with the same wording and severity — only the locator differs, naming the key rather than a line:

```text
▸ Potential secrets in .env.example
──────────────────────────────────────────────────────────────────────
found high-entropy string (len 95, H≈0.89)  STRIPE_KEY
```

---

## False Positive Protections

The scanner automatically skips values that are clearly not secrets:

| Pattern | Example |
|---|---|
| UUIDs | `550e8400-e29b-41d4-a716-446655440000` |
| Hex hashes | MD5, SHA-1, SHA-256 (32–128 hex chars) |
| Short base64 IDs | 16–20 char base64 strings |
| Data URIs | `data:image/png;base64,...` |
| Relative paths | `./assets/image.png` |
| SVG path data | `M10 20 L30 40 Z` |
| Character set literals | `abcdefghijklmnopqrstuvwxyz0123456789` (used with `nanoid` etc.) |
| UI label strings | Any value containing spaces |
| Minified lines | Lines over 500 characters are skipped entirely |
| Comment-only lines | Lines starting with `//` |
| Env accessors | `process.env.MY_KEY`, `import.meta.env.MY_KEY` |

---

## Suppressing False Positives

If a finding is a known false positive, suppress it with an ignore comment on the same line.

### Single line

```typescript
const apiKey = 'safe_value_for_tests_123123'; // dotenv-diff-ignore
```

```html
<a href="https://legacy.internal.com"> <!-- dotenv-diff-ignore -->
```

### Block

```html
<!-- dotenv-diff-ignore-start -->
<img src="https://cdn.safe-service.com/image.png" />
<!-- dotenv-diff-ignore-end -->
```

Ignore markers are **case-insensitive** and support `//`, `/* */`, and `<!-- -->` comment styles.

For broader suppression across files or URL patterns, see [Ignore Comments](./ignore_comments.md) and [Configuration and Flags](./configuration_and_flags.md).
