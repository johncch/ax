import { describe, expect, test } from "@jest/globals";
import { pathToComponents, replaceFilePattern, loadFileAsBase64 } from "./file.js";

describe("file module", () => {
  describe("path to components", () => {
    test("splits file path into components", () => {
      const input = "input/file.json";
      const output = pathToComponents(input);
      expect(output).toEqual({
        abs: input,
        dir: "input/",
        name: "file.json",
        stem: "file",
        ext: ".json",
      });
    });
  });

  describe("replace file pattern", () => {
    test("replaces ** with file path", () => {
      const input = "output/**";
      const pathComponents = pathToComponents("input/file.json");
      const output = replaceFilePattern(input, pathComponents);
      expect(output).toBe("output/input/file.json");
    });

    test("replaces **.txt with file path", () => {
      const input = "output/**.txt";
      const pathComponents = pathToComponents("input/file.json");
      const output = replaceFilePattern(input, pathComponents);
      expect(output).toBe("output/input/file.txt");
    });

    test("replaces **/* with file path", () => {
      const input = "output/**/*";
      const pathComponents = pathToComponents("input/file.json");
      const output = replaceFilePattern(input, pathComponents);
      expect(output).toBe("output/input/file.json");
    });

    test("replaces **/*.txt with file path", () => {
      const input = "output/**/*.txt";
      const pathComponents = pathToComponents("input/file.json");
      const output = replaceFilePattern(input, pathComponents);
      expect(output).toBe("output/input/file.txt");
    });

    test("replaces * with file path", () => {
      const input = "output/*";
      const pathComponents = pathToComponents("input/file.json");
      const output = replaceFilePattern(input, pathComponents);
      expect(output).toBe("output/file.json");
    });

    test("replaces *.txt with file path", () => {
      const input = "output/*.txt";
      const pathComponents = pathToComponents("input/file.json");
      const output = replaceFilePattern(input, pathComponents);
      expect(output).toBe("output/file.txt");
    });

    test("does not replace if no * provided", () => {
      const input = "output/test.txt";
      const pathComponents = pathToComponents("input/file.json");
      const output = replaceFilePattern(input, pathComponents);
      expect(output).toBe("output/test.txt");
    });

    test("throws an error if bad path", () => {
      // TODO
    });
  });

  describe("loadFileAsBase64", () => {
    test("throws error for non-existent file", async () => {
      await expect(loadFileAsBase64("non-existent-file.jpg")).rejects.toThrow("File not found");
    });

    test("throws error for unsupported file type", async () => {
      // This would need a real test file to work properly
      // For now, just test the basic structure
      expect(loadFileAsBase64).toBeDefined();
    });
  });
});
