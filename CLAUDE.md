# Build, Test & Lint Commands

- Build: `npm run build` (pkgroll with clean-dist and minify)
- Test all: `npm test`
- Test single: `npm test -- -t "test name pattern"` or `npm test -- path/to/file.test.ts`
- Start: `npm start` (runs with tsx)

# Code Style Guidelines

- **Imports**: ES modules, use node: prefix for Node.js modules
- **Formatting**: 2-space indentation, Prettier with organize-imports plugin
- **Types**: Strong TypeScript typing, explicit function parameters and returns
- **Naming**: 
  - PascalCase for interfaces (e.g., `FilePathInfo`)
  - camelCase for functions and variables
- **Error Handling**: Use descriptive error messages in try/catch blocks
- **Testing**: Jest with descriptive test names, organize with nested describe blocks

# Repository Structure

- `src/`: Source code
  - `actions/`: Command implementation
  - `commands/`: CLI commands
  - `providers/`: LLM provider integrations
  - `tools/`: External tool integrations
  - `utils/`: Helper functions
- `examples/`: Sample job definitions