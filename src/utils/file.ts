import { glob } from "glob";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Recorder } from "../recorder/recorder.js";
import { FilePathInfo, LoadFileResults } from "./types.js";

export async function loadFile({
  path,
  defaults,
  loader = "File",
}: {
  path: string | null;
  defaults: {
    name: string;
    formats: string[];
  };
  loader?: string;
}): Promise<LoadFileResults> {
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

export async function loadManyFiles(filenames: string[], recorder?: Recorder) {
  let replacement = "";
  for (const name of filenames) {
    const files = await glob(name);
    recorder?.debug?.log(
      `many-files parser. For glob "${name}", found ${files.length} files.`,
    );
    const replacements = await Promise.all(
      files.map(async (name) => {
        const c = await readFile(name, "utf-8");
        return name + ":\n" + c;
      }),
    );
    replacement += replacements.join("\n");
  }
  return replacement;
}

export function replaceFilePattern(pattern: string, path: FilePathInfo) {
  pattern = pattern.replace("**/*", "**"); // these are equivalent
  const regex = /(?<asterisks>\*{1,2})(?<extension>\.[^\\/]+)?/;
  const match = pattern.match(regex);

  if (match) {
    let replacement = "";
    if (match.groups?.asterisks.length == 1) {
      replacement += path.stem;
    } else {
      replacement += path.dir + path.stem;
    }

    if (match.groups?.extension) {
      replacement += match.groups.extension;
    } else {
      replacement += path.ext;
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
      abs: fullpath,
      dir: fullpath.replace(matches[0], ""),
      ext: matches.groups.extension,
      stem: matches.groups.name,
      name: matches[0],
    };
  }
  return null;
}

export async function fileExists({
  baseName,
  directory = ".",
}: {
  baseName: string;
  directory?: string;
}): Promise<boolean> {
  try {
    const files = await glob(`${directory}/${baseName}.*`);
    return files.length > 0;
  } catch {
    return false;
  }
}

// Function to ensure the directory exists
export async function ensureDirectoryExistence(filePath: string) {
  const dirName = dirname(filePath);
  try {
    await access(dirName);
  } catch (err) {
    await mkdir(dirName);
    await ensureDirectoryExistence(dirName);
  }
}

// Function to write the file
export async function writeFileWithDirectories({
  filePath,
  content,
}: {
  filePath: string;
  content: string;
}) {
  await ensureDirectoryExistence(filePath);
  await writeFile(filePath, content);
}
