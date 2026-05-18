import { readFileSync } from "fs";
import { resolve } from "path";

const pluginRoot = resolve(__dirname, "../..");

describe("Koszyk plugin scaffold", () => {
  it("index.html loads SDK script from http://localhost:8080/assets/plugin-sdk.js", () => {
    const content = readFileSync(resolve(pluginRoot, "index.html"), "utf-8");
    expect(content).toContain(
      'src="http://localhost:8080/assets/plugin-sdk.js"',
    );
  });

  it("index.html loads stylesheet from http://localhost:8080/assets/plugin-ui.css", () => {
    const content = readFileSync(resolve(pluginRoot, "index.html"), "utf-8");
    expect(content).toContain(
      'href="http://localhost:8080/assets/plugin-ui.css"',
    );
  });

  it("vite.config.ts declares port 3012 with strictPort: true", () => {
    const content = readFileSync(resolve(pluginRoot, "vite.config.ts"), "utf-8");
    expect(content).toContain("port: 3012");
    expect(content).toContain("strictPort: true");
  });
});
