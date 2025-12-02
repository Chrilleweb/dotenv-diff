import type { EnvUsage } from "../../config/types.js";
import type { frameworkWarning } from "../frameworkValidator.js";

export function applyAngularRules(
  u: EnvUsage,
  warnings: frameworkWarning[]
) {
  if (u.pattern === "process.env") {
    if (u.file.includes("app") && u.file.endsWith(".component.ts")) {
      warnings.push({
        variable: u.variable,
        reason: `Avoid using process.env directly in Angular components`,
        file: u.file,
        line: u.line,
        framework: "angular",
      });
    }
  }

  if (
    u.pattern === "process.env" &&
    (u.variable.startsWith("CLIENT_") || u.variable.startsWith("BROWSER_"))
  ) {
    warnings.push({
      variable: u.variable,
      reason: `Use NG_APP_ prefix for Angular client-side variables`,
      file: u.file,
      line: u.line,
      framework: "angular",
    });
  }
}
