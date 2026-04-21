# Security Scanner

`dotenv-diff` scans your source files and `.env.example` for hardcoded secrets using three complementary techniques.

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
- The attribute name is **not** a known harmless UI prop (`label`, `placeholder`, `name`, `title`, `aria-label`, etc.)
- The line does **not** read from an env accessor (`process.env`, `import.meta.env`, SvelteKit `$env/*`)
- The value is **not** a pure interpolation template (e.g. `` `${a}:${b}` ``)

---

## 3. High-Entropy String Detection (medium / high severity)

Uses [Shannon entropy](https://en.wikipedia.org/wiki/Entropy_(information_theory)) to detect randomly-generated secrets — strings that are statistically too random to be written by hand.

| String length | Entropy threshold | Severity |
|---|---|---|
| 32–47 chars | ≥ 0.85 (normalized) | medium |
| 48+ chars | ≥ 0.85 (normalized) | high |

> In test files (`*.spec.ts`, `*.test.ts`, `__tests__/`, `fixtures/`, etc.) the threshold is raised to **0.95** to reduce false positives.

---

## Example File Scanning

`.env.example` files are scanned separately with relaxed rules, since example files are expected to contain placeholder values. Entries are skipped when the value:

- Is empty
- Equals `example` or `placeholder` (case-insensitive)
- Contains `your_` or `CHANGE_ME`
- Contains `<` (typical for `<your-value-here>` style templates)

Remaining values are still checked against [provider patterns](#1-provider-pattern-matching-high-severity) and entropy (threshold ≥ 0.8 for values ≥ 24 characters).

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
