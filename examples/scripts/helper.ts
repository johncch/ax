import { Axle } from "../../src/index.js";

export function getAxle(): Axle {
  const args = process.argv.slice(2);
  const providerArg = args.find(
    (arg) => arg.startsWith("--") || arg.startsWith("-"),
  );
  const provider = providerArg || "--ollama"; // default to anthropic

  switch (provider) {
    case "--openai":
    case "-o":
      console.log("using openai");
      return new Axle({
        openai: { "api-key": process.env.OPENAI_API_KEY!, model: "gpt-4o" },
      });

    case "--google":
    case "--googleai":
    case "-g":
      console.log("using google");
      return new Axle({
        googleai: { "api-key": process.env.GOOGLE_AI_API_KEY! },
      });

    case "--anthropic":
    case "-a":
      console.log("using anthropic");
      return new Axle({
        anthropic: {
          "api-key": process.env.ANTHROPIC_API_KEY!,
        },
      });

    case "--ollama":
    case "-ol":
    default:
      console.log("using ollama");
      return new Axle({
        ollama: { model: "gemma3" },
      });
  }
}
