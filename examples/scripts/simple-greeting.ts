import { config } from "dotenv";
import { Instruct, WriteOutputTask } from "../../src/index.js";
import { getAxle } from "./helper.js";
config();

const instruct = Instruct.with(
  "Please provide a friendly greeting for {{name}}",
  { greeting: "string" },
);
instruct.addInput("name", "John Doe");

const writeTask = new WriteOutputTask("./output/greeting-{name}.txt");

const axle = getAxle();
const result = await axle.execute(instruct, writeTask);

console.log(result);
console.log(instruct.result.greeting);
