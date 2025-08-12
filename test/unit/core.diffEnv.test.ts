import { describe, expect, it } from 'vitest';
import { diffEnv } from '../../src/lib/diffEnv.js';

describe("diffEnv", () => {
  it("detects missing and extra keys (no value checking)", () => {
    const current = { A: "1", B: "2", C: "3" };
    const example = { A: "", B: "", D: "" };

    const result = diffEnv(current, example);

    expect(result.missing).toEqual(["D"]);
    expect(result.extra).toEqual(["C"]);
    expect(result.valueMismatches).toEqual([]);
  });

  it("returns empty arrays when keys and values match", () => {
    const current = { A: "foo", B: "bar" };
    const example = { A: "foo", B: "bar" };

    const result = diffEnv(current, example, true);

    expect(result).toEqual({ missing: [], extra: [], valueMismatches: [] });
  });

  it("detects value mismatches when checkValues is true", () => {
    const current = { A: "Hello", B: "World" };
    const example = { A: "hello", B: "world" };

    const result = diffEnv(current, example, true);

    expect(result.missing).toEqual([]);
    expect(result.extra).toEqual([]);
    expect(result.valueMismatches).toEqual([
      { key: "A", expected: "hello", actual: "Hello" },
      { key: "B", expected: "world", actual: "World" },
    ]);
  });

  it("ignores value mismatches when checkValues is false (default)", () => {
    const current = { A: "Hello", B: "World" };
    const example = { A: "hello", B: "world" };

    const result = diffEnv(current, example);

    expect(result.missing).toEqual([]);
    expect(result.extra).toEqual([]);
    expect(result.valueMismatches).toEqual([]);
  });

  it("ignores value mismatches when .env.example values are empty", () => {
    const current = { A: "1", B: "2" };
    const example = { A: "", B: "" };

    const result = diffEnv(current, example, true);

    expect(result.missing).toEqual([]);
    expect(result.extra).toEqual([]);
    expect(result.valueMismatches).toEqual([]);
  });

  it("handles empty .env file as all missing", () => {
    const current = {};
    const example = { A: "x", B: "y" };

    const result = diffEnv(current, example, true);

    expect(result.missing).toEqual(["A", "B"]);
    expect(result.extra).toEqual([]);
    expect(result.valueMismatches).toEqual([]);
  });

  it("handles empty .env.example file as all extra", () => {
    const current = { A: "1", B: "2" };
    const example = {};

    const result = diffEnv(current, example, true);

    expect(result.missing).toEqual([]);
    expect(result.extra).toEqual(["A", "B"]);
    expect(result.valueMismatches).toEqual([]);
  });

  it("does not report value mismatch if checkValues is false", () => {
    const current = { A: "abc" };
    const example = { A: "def" };

    const result = diffEnv(current, example);

    expect(result.valueMismatches).toEqual([]);
  });

  it("ignores key order", () => {
    const current = { B: "2", A: "1" };
    const example = { A: "1", B: "2" };

    const result = diffEnv(current, example, true);

    expect(result).toEqual({ missing: [], extra: [], valueMismatches: [] });
  });
});
