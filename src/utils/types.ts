/* File Types */
export interface LoadFileResults {
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
