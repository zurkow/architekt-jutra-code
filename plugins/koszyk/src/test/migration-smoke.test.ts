/**
 * Smoke tests for Next.js migration infrastructure (Group 1).
 * These tests verify the migration wiring without testing CartPage business logic.
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const pluginRoot = resolve(__dirname, "../..");

describe("Next.js migration smoke tests", () => {
  it("src/pages/index.tsx imports CartPage from ./CartPage", () => {
    const indexPath = resolve(pluginRoot, "src/pages/index.tsx");
    expect(existsSync(indexPath)).toBe(true);
    const content = readFileSync(indexPath, "utf-8");
    expect(content).toContain("CartPage");
    expect(content).toContain("./CartPage");
  });

  it("jest.config.js resolves TypeScript and TSX files", () => {
    const jestConfigPath = resolve(pluginRoot, "jest.config.js");
    expect(existsSync(jestConfigPath)).toBe(true);
    const content = readFileSync(jestConfigPath, "utf-8");
    expect(content).toContain("ts-jest");
    expect(content).toContain('"tsx"');
    expect(content).toContain('"ts"');
  });

  it("src/test/setup.ts imports @testing-library/jest-dom (not vitest variant)", () => {
    const setupPath = resolve(pluginRoot, "src/test/setup.ts");
    expect(existsSync(setupPath)).toBe(true);
    const content = readFileSync(setupPath, "utf-8");
    expect(content).toContain("@testing-library/jest-dom");
    expect(content).not.toContain("/vitest");
  });
});
