import { glob } from "glob";
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { resolve } from "node:path";
import path from "path";

interface LoadFileResults {
  content: string;
  format: string;
}

export interface FilePathInfo {
  absolutePath: string;
  directoryPath: string;
  fileExtension: string;
  fileNameStem: string;
  fullFileName: string;
}

export async function loadFile(
  path: string | null,
  defaults: {
    name: string;
    formats: string[];
  },
  loader: string = "File",
): Promise<LoadFileResults> {
  let fileContents: string | null = null;
  let filePath: string = "";
  if (path) {
    try {
      filePath = resolve(path);
      fileContents = await readFile(filePath, { encoding: "utf-8" });
    } catch (e) {
      throw new Error(`${loader} not found, see --help for details`);
    }
  } else {
    for (const format of defaults.formats) {
      try {
        filePath = resolve(defaults.name + "." + format);
        fileContents = await readFile(filePath, { encoding: "utf-8" });
        break;
      } catch (e) {
        continue;
      }
    }
    if (fileContents === null) {
      throw new Error(`${loader} not found, see --help for details`);
    }
  }

  return {
    content: fileContents,
    format: filePath.split(".").pop() ?? "",
  };
}

export function replaceFilePattern(pattern: string, path: FilePathInfo) {
  pattern = pattern.replace("**/*", "**"); // these are equivalent
  const regex = /(?<asterisks>\*{1,2})(?<extension>\.[^\\/]+)?/;
  const match = pattern.match(regex);

  if (match) {
    let replacement = "";
    if (match.groups?.asterisks.length == 1) {
      replacement += path.fileNameStem;
    } else {
      replacement += path.directoryPath + path.fileNameStem;
    }

    if (match.groups?.extension) {
      replacement += match.groups.extension;
    } else {
      replacement += path.fileExtension;
    }

    return pattern.replace(match[0], replacement);
  }

  return pattern;
}

export function pathToComponents(fullpath: string): FilePathInfo | null {
  const regex = /(?<name>[^\\/]+)(?<extension>\.[^\\/]+)$/;
  const matches = fullpath.match(regex);
  if (matches && matches.length > 0 && matches.groups) {
    return {
      absolutePath: fullpath,
      directoryPath: fullpath.replace(matches[0], ""),
      fileExtension: matches.groups.extension,
      fileNameStem: matches.groups.name,
      fullFileName: matches[0],
    };
  }
  return null;
}

export async function fileExists(
  baseName: string,
  directory: string = ".",
): Promise<boolean> {
  try {
    const files = await glob(`${directory}/${baseName}.*`);
    return files.length > 0;
  } catch {
    return false;
  }
}

// Function to ensure the directory exists
export async function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  try {
    await access(dirname);
  } catch (err) {
    await ensureDirectoryExistence(dirname);
    await mkdir(dirname);
  }
}

// Function to write the file
export async function writeFileWithDirectories(filePath, content) {
  await ensureDirectoryExistence(filePath);
  await writeFile(filePath, content);
}
