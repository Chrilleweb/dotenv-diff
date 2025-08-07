import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// Test directory for isolated testing
const testDir = path.join(process.cwd(), "test-tmp");
const envPath = path.join(testDir, ".env");
const examplePath = path.join(testDir, ".env.example");
const cliPath = path.join(process.cwd(), "dist/cli.js");

describe("CLI file generation", () => {
  beforeEach(() => {
    // Create test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  it("should create .env from .env.example when user answers yes", () => {
    // Create .env.example
    const exampleContent = "TEST=value\nSECOND=another";
    fs.writeFileSync(examplePath, exampleContent);

    // Run CLI with 'y' input
    const result = execSync(`echo "y" | node ${cliPath}`, {
      cwd: testDir,
      encoding: "utf-8",
    });

    // Check that .env was created with correct content
    expect(fs.existsSync(envPath)).toBe(true);
    expect(fs.readFileSync(envPath, "utf-8")).toBe(exampleContent);
    expect(result).toContain("📄 .env file not found.");
    expect(result).toContain("✅ .env file created successfully.");
  });

  it("should not create .env when user answers no", () => {
    // Create .env.example
    fs.writeFileSync(examplePath, "TEST=value");

    // Run CLI with 'n' input
    const result = execSync(`echo "n" | node ${cliPath}`, {
      cwd: testDir,
      encoding: "utf-8",
    });

    // Check that .env was not created
    expect(fs.existsSync(envPath)).toBe(false);
    expect(result).toContain("📄 .env file not found.");
    expect(result).toContain("🚫 .env file creation cancelled.");
  });

  it("should preserve comments and formatting when creating .env", () => {
    // Create .env.example with comments and formatting
    const exampleContent = `# Database config
DB_HOST=localhost
DB_PORT=5432

# API configuration
API_KEY=test_key
SECRET=

# End comment`;
    fs.writeFileSync(examplePath, exampleContent);

    // Run CLI with 'y' input
    execSync(`echo "y" | node ${cliPath}`, {
      cwd: testDir,
      encoding: "utf-8",
    });

    // Check that .env preserves exact formatting
    expect(fs.readFileSync(envPath, "utf-8")).toBe(exampleContent);
  });

  it("should show warning when both files are missing", () => {
    // Don't create any files
    
    // Run CLI
    const result = execSync(`node ${cliPath}`, {
      cwd: testDir,
      encoding: "utf-8",
    });

    expect(result.trim()).toBe("⚠️ No .env or .env.example file found. Skipping comparison.");
  });

  it("should continue with normal comparison after creating .env", () => {
    // Create .env.example with a key
    fs.writeFileSync(examplePath, "TEST=value\nMISSING_KEY=should_warn");

    // Run CLI with 'y' input to create .env, then it should compare
    const result = execSync(`echo "y" | node ${cliPath}`, {
      cwd: testDir,
      encoding: "utf-8",
    });

    expect(result).toContain("✅ .env file created successfully.");
    expect(result).toContain("🔍 Comparing .env and .env.example...");
    expect(result).toContain("✅ All keys match! Your .env file is valid.");
  });
});