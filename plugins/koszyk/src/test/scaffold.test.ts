import { readFileSync } from "fs";
import { resolve } from "path";

const pluginRoot = resolve(__dirname, "../..");

describe("Koszyk plugin scaffold", () => {
  it("_document.tsx loads SDK script from http://localhost:8080/assets/plugin-sdk.js", () => {
    const content = readFileSync(resolve(pluginRoot, "src/pages/_document.tsx"), "utf-8");
    expect(content).toContain(
      'src="http://localhost:8080/assets/plugin-sdk.js"',
    );
  });

  it("_document.tsx loads stylesheet from http://localhost:8080/assets/plugin-ui.css", () => {
    const content = readFileSync(resolve(pluginRoot, "src/pages/_document.tsx"), "utf-8");
    expect(content).toContain(
      'href="http://localhost:8080/assets/plugin-ui.css"',
    );
  });

  it("package.json dev script uses Next.js on port 3012", () => {
    const content = readFileSync(resolve(pluginRoot, "package.json"), "utf-8");
    const pkg = JSON.parse(content) as { scripts: { dev: string } };
    expect(pkg.scripts.dev).toContain("next dev");
    expect(pkg.scripts.dev).toContain("3012");
  });
});
