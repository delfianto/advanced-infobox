import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      src: path.resolve("./src"),
      // `obsidian` ships only as a runtime module loaded by Obsidian itself;
      // unit tests stub it so files that pull in parseYaml/TFile/etc can still load.
      obsidian: path.resolve("./test/__mocks__/obsidian.ts"),
    },
  },
  test: {
    globals: true,
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
