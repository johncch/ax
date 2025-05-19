import { Task } from "../../types.js";

export interface WriteToDiskTask extends Task {
  type: "write-to-disk";
  output: string;
}

export class WriteOutputTask implements Task {
  type: "write-to-disk";
  constructor(public output: string) {}
}
