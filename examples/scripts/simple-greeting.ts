import { Axle, Instruct, WriteOutputTask } from "../../src/index.js";

const apiKey = process.env.OPENAI_API_KEY;
const antropicApiKey = process.env.ANTHROPIC_API_KEY;

const instruct = Instruct.with(
  "Please provide a friendly greeting for {{name}}",
  { greeting: "string" },
);
instruct.addInput("name", "John Doe");

const writeTask = new WriteOutputTask("./output/greeting-{name}.txt");

// const axle = new Axle({ ollama: { model: "qwen3:32b" } });
// const axle = new Axle({ ollama: { model: "gemma3" } });
// const axle = new Axle({ openai: { "api-key": apiKey } });
const axle = new Axle({ anthropic: { "api-key": antropicApiKey } });
const result = await axle.execute(instruct);
console.log(result);
console.log(instruct.result.greeting);
