import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { applyFixes } from "../../src/core/fixEnv.js";

// helper to create temp files
function makeTempFile(name: string, content: string): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dotenv-diff-"));
  const filePath = path.join(tmpDir, name);
  fs.writeFileSync(filePath, content);
  return filePath;
}

describe("applyFixes", () => {
  let envPath: string;
  let examplePath: string;

  beforeEach(() => {
    envPath = makeTempFile(".env", "");
    examplePath = makeTempFile(".env.example", "");
  });

  afterEach(() => {
    // clean up
    try { fs.unlinkSync(envPath); } catch {}
    try { fs.unlinkSync(examplePath); } catch {}
  });

  it("removes duplicate keys from .env", () => {
    fs.writeFileSync(envPath, "A=1\nB=2\nA=3\n");
    const { changed, result } = applyFixes({
      envPath,
      examplePath,
      missingKeys: [],
      duplicateKeys: ["A"],
    });

    const finalContent = fs.readFileSync(envPath, "utf-8");
    expect(changed).toBe(true);
    expect(result.removedDuplicates).toEqual(["A"]);
    expect(finalContent).toBe("B=2\nA=3\n"); // last occurrence wins
  });

  it("adds missing keys to .env", () => {
    fs.writeFileSync(envPath, "A=1\n");
    const { changed, result } = applyFixes({
      envPath,
      examplePath,
      missingKeys: ["B", "C"],
      duplicateKeys: [],
    });

    const finalContent = fs.readFileSync(envPath, "utf-8");
    expect(changed).toBe(true);
    expect(result.addedEnv).toEqual(["B", "C"]);
    expect(finalContent).toContain("B=");
    expect(finalContent).toContain("C=");
  });

  it("syncs missing keys to .env.example", () => {
    fs.writeFileSync(envPath, "A=1\n");
    fs.writeFileSync(examplePath, "A=\n");
    const { changed, result } = applyFixes({
      envPath,
      examplePath,
      missingKeys: ["B"],
      duplicateKeys: [],
    });

    const finalExample = fs.readFileSync(examplePath, "utf-8");
    expect(changed).toBe(true);
    expect(result.addedExample).toEqual(["B"]);
    expect(finalExample).toContain("B");
  });

  it("does not duplicate keys in .env.example if already present", () => {
    fs.writeFileSync(examplePath, "A=\nB=\n");
    const { changed, result } = applyFixes({
      envPath,
      examplePath,
      missingKeys: ["B"],
      duplicateKeys: [],
    });

    const finalExample = fs.readFileSync(examplePath, "utf-8");
    expect(result.addedExample).toEqual([]);
    expect(finalExample.match(/^B=/gm)?.length).toBe(1); // only one B
  });

  it("returns no changes when nothing to fix", () => {
    fs.writeFileSync(envPath, "A=1\n");
    fs.writeFileSync(examplePath, "A=\n");
    const { changed, result } = applyFixes({
      envPath,
      examplePath,
      missingKeys: [],
      duplicateKeys: [],
    });

    expect(changed).toBe(false);
    expect(result).toEqual({
      removedDuplicates: [],
      addedEnv: [],
      addedExample: [],
    });
  });
});
