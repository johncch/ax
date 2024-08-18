# axle (AI eXecution and Logic Engine)

## Introduction

axle (AI eXecution and Logic Engine) is a powerful command-line tool designed for running complex workflows against Language Model (LLM) APIs. It enables users to create and execute multi-step workflows while interacting with the file system, making it an ideal solution for automating repetitive tasks and handling complex interactions with AI models.

With axle, you can:
- Define and run sophisticated AI-powered workflows
- Interact with multiple AI providers (currently supporting OpenAI and Anthropic)
- Process batch operations on multiple files
- Customize input and output handling
- Integrate AI capabilities into your existing workflows and tools

Whether you're a developer, researcher, or content creator, axle provides a flexible and extensible platform for leveraging AI in your projects.

## Installation

To install axle, you need to have Node.js and npm (Node Package Manager) installed on your system. Once you have these prerequisites, you can install axle using the following command:

```bash
npm install -g axis
```

This will install axle globally on your system, allowing you to use the `ax` or `axis` command from any directory.

## Usage

After installation, you can use axle by running the `ax` or `axis` command followed by various options and arguments. Here's the basic syntax:

```bash
ax [options] [command]
```

Common options include:

- `--dry-run`: Run the application without executing against the AI providers
- `-c, --config <path>`: Specify the path to the config file
- `-j, --job <path>`: Specify the path to the job file
- `--no-log`: Do not write the output to a log file
- `-d, --debug`: Print additional debug information

To run a specific job defined in your job file:

```bash
ax -j path/to/your/job.yml
```

## Configuration Format

axle uses a configuration file to manage API keys and other settings. The default name for this file is `ax.config.yml` (or `.json`), but you can specify a different file using the `-c` option.

Here's an example of the configuration file format:

```yaml
providers:
  openai:
    api-key: "your-openai-api-key"
  anthropic:
    api-key: "your-anthropic-api-key"
```

## Job File Format

Job files in axle define the workflows you want to execute. They are typically written in YAML format and consist of two main sections: `using` and `jobs`.

Here's an example of a job file structure:

```yaml
using:
  engine: openai
  model: gpt-4o

jobs:
  job-name:
    type: agent
    steps:
      - role: system
        content: "System message content"
      - role: user
        content: "User message content"
        replace:
          - pattern: "${input}"
            name: content
        response:
          - action: write-to-disk
            output: ./output/*.txt
```

Key components of a job file:

- `using`: Specifies the AI provider and model to use
- `jobs`: Defines one or more jobs, each with its own set of steps
- `steps`: Describes the sequence of interactions with the AI model
- `replace`: Allows for dynamic content replacement in messages
- `response`: Defines actions to take with the AI's response, such as writing to a file or saving to variables

axle supports both single-run "agent" jobs and "batch" jobs that process multiple files. The job file format is flexible and allows for complex workflows, including file system interactions and variable management.

For more detailed information on job file formats and advanced usage, please refer to the examples provided in the repository.
