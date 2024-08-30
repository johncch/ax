# axle: AI eXecution and Logic Engine

axle is a powerful command-line tool designed for running complex workflows against Large Language Model (LLM) APIs. It allows users to create and execute multi-step workflows, interact with the file system, and automate repetitive tasks.

## Introduction

axle (AI eXecution and Logic Engine) is a versatile CLI tool that enables users to define and run sophisticated AI-powered workflows. It supports multiple LLM providers, offers flexible job configurations, and provides powerful file manipulation capabilities. Whether you're doing batch processing, research synthesis, or code generation, axle streamlines your AI-assisted workflows.

## Installation

To install axle, follow these steps:

1. Ensure you have Node.js installed on your system.
2. Clone the axle repository:
   ```
   git clone https://github.com/your-repo/axle.git
   ```
3. Navigate to the axle directory:
   ```
   cd axle
   ```
4. Install dependencies:
   ```
   npm install
   ```
5. Build the project:
   ```
   npm run build
   ```
6. Link the CLI globally (optional):
   ```
   npm link
   ```

## Usage

To use axle, you need to create a job file and a configuration file. Here's a basic example:

1. Create a configuration file named `ax.config.yml`:
   ```yaml
   providers:
     openai:
       api-key: your-openai-api-key
     anthropic:
       api-key: your-anthropic-api-key
   ```

2. Create a job file, e.g., `example.job.yml`:
   ```yaml
   using:
     engine: openai
     model: gpt-4o

   jobs:
     example-job:
       type: agent
       steps:
         - action: chat
           system: "You are a helpful assistant."
           content: "Hello, how can I help you today?"
         - action: write-to-disk
           output: ./output/response.txt
   ```

3. Run the job:
   ```
   ax --job example.job.yml
   ```

## Configuration Format

The configuration file (`ax.config.yml`) specifies the API keys for different providers. It follows this structure:

```yaml
providers:
  provider_name:
    api-key: your_api_key
    model: optional_default_model
```

Supported providers include `openai` and `anthropic`.

## Job File Format

Job files define the workflows to be executed. They are written in YAML and consist of the following main sections:

1. `using`: Specifies the AI provider and model to use.
2. `jobs`: Defines one or more jobs to be executed.

Each job can be of type `agent` or `batch` and consists of a series of steps.

### Step Types

1. Chat Action:
   ```yaml
   action: chat
   system: Optional system message
   content: User message or prompt
   replace: Optional replacements
   ```

2. Write to Disk Action:
   ```yaml
   action: write-to-disk
   output: Path to output file
   ```

3. Save to Variables Action:
   ```yaml
   action: save-to-variables
   name: Variable name to save content
   ```

### Replace Options

Replace options allow dynamic content insertion:

- Variables:
  ```yaml
  pattern: ${variable_name}
  name: variable_name
  ```

- File:
  ```yaml
  pattern: ${pattern_to_replace}
  source: file
  name: path/to/file.txt
  ```

- Many Files:
  ```yaml
  pattern: ${pattern_to_replace}
  source: many-files
  name: glob/pattern/*.txt
  ```

axle provides a flexible and powerful way to create complex AI workflows, making it an invaluable tool for developers and researchers working with LLMs.
