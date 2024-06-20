import YAML from "yaml";
import fs from "fs/promises";
import path from "path";

export async function readInputFile(filepath) {
  const format = filepath.split(".").pop();
  const file = await fs.readFile(filepath, "utf-8");

  let input = file;
  if (format === "json") {
    input = JSON.parse(file);
  } else if (format === "yaml" || format === "yml") {
    input = YAML.parse(file);
  }
  return input;
}

export function replaceFilePattern(pattern, path) {
  pattern = pattern.replace("**/*", "**"); // these are equivalent
  const regex = /(?<asterisks>\*{1,2})(?<extension>\.[^\\/]+)?/;
  const match = pattern.match(regex);

  if (match) {
    let replacement = "";
    if (match.groups.asterisks.length == 1) {
      replacement += path.file.name;
    } else {
      replacement += path.folders + path.file.name;
    }

    if (match.groups.extension) {
      replacement += match.groups.extension;
    } else {
      replacement += path.file.extension;
    }

    return pattern.replace(match[0], replacement);
  }

  return pattern;
}

export function pathToComponents(fullpath) {
  const regex = /(?<name>[^\\/]+)(?<extension>\.[^\\/]+)$/;
  const matches = fullpath.match(regex);

  return {
    path: fullpath,
    folders: fullpath.replace(matches[0], ""),
    file: {
      full: matches[0],
      name: matches.groups.name,
      extension: matches.groups.extension,
    },
  };
}

// Function to ensure the directory exists
export async function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  try {
    await fs.access(dirname);
  } catch (err) {
    await ensureDirectoryExistence(dirname);
    await fs.mkdir(dirname);
  }
}

// Function to write the file
export async function writeFileWithDirectories(filePath, content) {
  await ensureDirectoryExistence(filePath);
  await fs.writeFile(filePath, content);
}
