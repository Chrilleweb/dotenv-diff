import {
  PROVIDER_PATTERNS,
  SUSPICIOUS_KEYS
} from "./secretDetectors.js";
import { shannonEntropyNormalized } from "./entropy.js";

export interface ExampleSecretWarning {
  key: string;
  value: string;
  reason: string;
  severity: "high" | "medium" | "low";
}

export function detectSecretsInExample(env: Record<string, string>): ExampleSecretWarning[] {
  const warnings: ExampleSecretWarning[] = [];

  for (const [key, rawValue] of Object.entries(env)) {
    if (!rawValue) continue;

    const value = rawValue.trim();

    // 1 — Skip placeholders
    if (
      value === "" ||
      value.toLowerCase() === "example" ||
      value.toLowerCase() === "placeholder" ||
      value.includes("your_") ||
      value.includes("<") ||
      value.includes("CHANGE_ME")
    ) {
      continue;
    }

    // 2 — Check provider patterns (AWS, Stripe, GitHub, JWT etc.)
    for (const rx of PROVIDER_PATTERNS) {
      if (rx.test(value)) {
        warnings.push({
          key,
          value,
          reason: "Value in .env.example matches a known provider key pattern",
          severity: "high"
        });
        continue;
      }
    }

    // 3 — Check suspicious keywords on values
    if (SUSPICIOUS_KEYS.test(key)) {
      if (value.length >= 12) {
        warnings.push({
          key,
          value,
          reason: "Suspicious key name combined with a non-placeholder value",
          severity: "medium"
        });
      }
    }

    // 4 — Check entropy (high randomness → real secret)
    if (value.length >= 24) {
      const entropy = shannonEntropyNormalized(value);
      if (entropy > 0.80) {
        warnings.push({
          key,
          value,
          reason: `High entropy value in .env.example (≈${entropy.toFixed(2)})`,
          severity: entropy > 0.92 ? "high" : "medium"
        });
      }
    }
  }

  return warnings;
}
