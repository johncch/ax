import { Task } from "../../types.js";

export interface WriteToDiskTask extends Task {
  type: "write-to-disk";
  output: string;
}
