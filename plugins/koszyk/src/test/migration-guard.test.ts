/**
 * Regression guard tests for the Vitest → Jest migration.
 * These tests assert migration completeness without relying on external tooling.
 */
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";

const testDir = resolve(__dirname);

function readTestFiles(): { name: string; content: string }[] {
  return readdirSync(testDir)
    .filter((f) => f.endsWith(".test.ts") || f.endsWith(".test.tsx"))
    .map((f) => ({ name: f, content: readFileSync(resolve(testDir, f), "utf-8") }));
}

describe("Vitest → Jest migration guard", () => {
  it("no test file references vi. (Vitest API)", () => {
    const files = readTestFiles();
    const violations: string[] = [];

    for (const file of files) {
      // Match vi. followed by a word character — excludes "device", "service", etc.
      // Use a word-boundary-style check: vi. must be preceded by whitespace, '(', or be at line start
      const matches = file.content.match(/(?<![a-zA-Z0-9_])vi\.[a-zA-Z]/g);
      if (matches) {
        violations.push(`${file.name}: found ${matches.join(", ")}`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("CartPage.test.tsx contains at least 9 test cases", () => {
    const content = readFileSync(resolve(testDir, "CartPage.test.tsx"), "utf-8");
    // Count it( and test( occurrences — each is one test case
    const itMatches = content.match(/^\s*(it|test)\s*\(/gm) ?? [];
    expect(itMatches.length).toBeGreaterThanOrEqual(9);
  });
});
