import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { loadConfig } from "../../src/config/loadConfig.js";
import { makeTmpDir } from "../utils/fs-helpers.js";

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = makeTmpDir();
});

describe("loadConfig", () => {
  it("finds config in parent directory when running from subfolder", () => {
    const rootConfigPath = path.join(tmpRoot, "dotenv-diff.config.json");
    const appDir = path.join(tmpRoot, "apps", "frontend");
    fs.mkdirSync(appDir, { recursive: true });

    // Write config in root
    fs.writeFileSync(rootConfigPath, JSON.stringify({ ignore: ["FOO"] }, null, 2));

    // Change CWD to app dir temporarily
    const oldCwd = process.cwd();
    process.chdir(appDir);

    const config = loadConfig({});
    process.chdir(oldCwd);

    expect(config.ignore).toEqual(["FOO"]);
  });

  it("uses local config if present in current directory", () => {
    const appDir = path.join(tmpRoot, "apps", "frontend");
    fs.mkdirSync(appDir, { recursive: true });

    // Local config should override parent one
    fs.writeFileSync(
      path.join(appDir, "dotenv-diff.config.json"),
      JSON.stringify({ ignore: ["BAR"] }, null, 2),
    );

    const oldCwd = process.cwd();
    process.chdir(appDir);

    const config = loadConfig({});
    process.chdir(oldCwd);

    expect(config.ignore).toEqual(["BAR"]);
  });

  it("returns empty config if no file found", () => {
    const noConfigDir = path.join(tmpRoot, "no-config");
    fs.mkdirSync(noConfigDir, { recursive: true });

    const oldCwd = process.cwd();
    process.chdir(noConfigDir);

    const config = loadConfig({});
    process.chdir(oldCwd);

    expect(config).toEqual({});
  });
});
