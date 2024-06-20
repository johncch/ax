import { replaceFilePattern, pathToComponents } from "./file";

describe("file module", () => {
  describe("path to components", () => {
    test("splits file path into components", () => {
      const input = "input/file.json";
      const output = pathToComponents(input);
      expect(output).toEqual({
        path: input,
        folders: "input/",
        file: {
          full: "file.json",
          name: "file",
          extension: ".json",
        },
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
});
