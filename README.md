# Axle: AI eXecution and Logic Engine

Axle is a CLI tool and library for building composable LLM workflows. Inspired by [DSPy](https://dspy.ai), it began as a command-line utility and has since evolved into a general-purpose workflow library.

The project is evolving quickly and the API is still unstable, so this README will remain minimal for now.

To get started, see the [examples](https://github.com/johncch/axle/tree/main/examples) directory.

## Configuration
For CLI use, you will need to provide a `ax.config.yml` where you're running the tool.

Here's what it looks like. Every field is optional depending on the provider you want to use.

```
openai:
  api-key: "<api-key>"
anthropic:
  api-key: "<api-key>"
ollama:
  url: "<url>"
brave:
  api-key: "<api-key>"
  rateLimit: 1
```
