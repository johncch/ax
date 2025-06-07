# LLM Provider PrepareRequest Unit Tests Documentation

## Overview

This document provides comprehensive documentation for the unit tests covering the Chat class and `prepareRequest` functions across all LLM provider implementations. These tests ensure consistent behavior and robust validation of chat functionality and request preparation across different AI providers.

## Test File Locations

- **Chat Class**: `src/ai/chat.test.ts`
- **Multimodal Support**: `src/ai/multimodal.test.ts`
- **Anthropic**: `src/ai/anthropic/provider.test.ts`
- **Google AI**: `src/ai/googleai/provider.test.ts`
- **OpenAI ChatCompletion**: `src/ai/openai/chatcompletion.test.ts`
- **OpenAI ResponsesAPI**: `src/ai/openai/responsesAPI.test.ts`
- **Ollama**: `src/ai/ollama/provider.test.ts`

## Test Statistics

- **Total Tests**: 212 tests (21 Chat class tests + 191 AI/provider tests)
- **Test Suites**: 11 test suites total (1 Chat class + 5 provider tests + 5 other components)
- **Coverage**: Comprehensive coverage across Chat class and all providers with consistent test scenarios

## Common Test Categories

All provider test files follow a consistent structure with these main test categories:

### 1. Basic Chat Configurations
Tests fundamental chat setup scenarios:
- **Empty chat**: Validates handling of completely empty chat instances
- **System message only**: Tests chat with only system prompts
- **Single user message**: Basic user message handling
- **System + user messages**: Combined system and user message scenarios
- **Multiple exchanges**: Complex conversations with alternating user/assistant messages

### 2. Multimodal Content
Tests file handling and multimodal content:
- **Image handling**: Support for various image formats (JPEG, PNG, GIF, WebP)
- **Document handling**: PDF and other document type processing
- **Multiple files**: Handling multiple files in a single message
- **Mixed content**: Combining text, instructions, and files
- **Files without text**: Content containing only files

### 3. Tool Configurations
Tests function calling and tool usage:
- **Single tool**: Chat with one available tool
- **Multiple tools**: Chat with multiple available tools
- **Tool calls**: Assistant messages containing tool calls
- **Tool results**: Processing tool execution results
- **Tool arguments**: Handling both object and string arguments

### 4. Assistant Message Handling
Tests assistant-specific message scenarios:
- **Without tool calls**: Basic assistant messages
- **With tool calls**: Assistant messages invoking tools
- **Empty content + tool calls**: Tool calls without accompanying text
- **Tool call formatting**: Proper tool call structure validation

### 5. File Type Filtering
Tests file type support and filtering:
- **Supported formats**: Validation of supported image/document formats
- **Unsupported filtering**: Rejection of unsupported file types (videos, etc.)
- **Format validation**: MIME type and format-specific handling
- **Multiple format mixing**: Combining supported and unsupported files

### 6. Complex Scenarios
Tests real-world usage patterns:
- **Complete conversations**: End-to-end conversation flows with tools and files
- **Message order preservation**: Ensuring correct message sequencing
- **Tool + multimodal**: Combining tool usage with file uploads
- **Comprehensive workflows**: Complex scenarios with all features combined

### 7. Edge Cases and Error Handling
Tests boundary conditions and error scenarios:
- **Empty content arrays**: Handling empty message content
- **Multiple text blocks**: Combining multiple text content blocks
- **Tool calls without IDs**: Handling missing tool call identifiers
- **Object vs string arguments**: Tool argument format variations
- **Malformed data**: Invalid JSON and data structure handling

## Chat Class Test Details

The Chat class tests (`src/ai/chat.test.ts`) provide comprehensive coverage of the core chat functionality and multimodal content handling that all providers depend on.

### Chat Class Features Tested

#### addUser Method Overloads
The Chat class supports four different overloads for adding user messages:

1. **Basic text message**: `addUser(message: string)`
   ```typescript
   chat.addUser("Hello");
   // Results in: { role: "user", content: "Hello" }
   ```

2. **Text with instructions**: `addUser(message: string, instruction: string)`
   ```typescript
   chat.addUser("Hello", "Please be friendly");
   // Results in multimodal content with text and instructions
   ```

3. **Text with files**: `addUser(message: string, files: FileInfo[])`
   ```typescript
   chat.addUser("Analyze this image", [imageFile]);
   // Results in multimodal content with text and files
   ```

4. **Text with instructions and files**: `addUser(message: string, instruction: string, files: FileInfo[])`
   ```typescript
   chat.addUser("Analyze this", "Be thorough", [imageFile]);
   // Results in multimodal content with text, instructions, and files
   ```

#### Content Helper Functions
Tests cover utility functions for extracting different content types:

- **getTextContent()**: Extracts only text portions from content
- **getInstructions()**: Extracts only instruction portions from content  
- **getTextAndInstructions()**: Combines text and instructions with configurable delimiter
- **getFiles()**: Extracts file attachments from content
- **getDocuments()**: Filters for document-type files only
- **getImages()**: Filters for image-type files only

#### Edge Case Handling
- **Empty instructions**: Correctly falls back to simple string content
- **Empty file arrays**: Properly handles instructions with no files
- **Multiple content blocks**: Handles multiple text or instruction blocks
- **Content type validation**: Ensures proper content structure

### Test Coverage Summary

**Total Chat Tests**: 21 tests across 5 describe blocks:
- **Basic functionality**: 4 tests (addUser overloads, system messages)
- **Multimodal functionality**: 3 tests (file handling scenarios)
- **Helper methods**: 12 tests (content extraction functions)
- **Edge cases**: 2 tests (boundary conditions)
- **Serialization**: 1 test (toString functionality)

**Key Test Scenarios**:
- All four addUser overload combinations
- String vs array content handling
- File attachment processing
- Instruction content integration
- Content type filtering and extraction
- JSON serialization

## Provider-Specific Test Details

### Anthropic Provider Tests

**Unique Features Tested:**
- **Tool result handling**: Dedicated tests for tool execution results
- **Content format**: Anthropic-specific content structure (array of content blocks)
- **System message separation**: System messages handled separately from message array
- **PDF-only filtering**: Only PDF documents supported, other document types filtered out
- **Tool input format**: Object arguments passed directly as `input` field

**Example Test Patterns:**
```typescript
// Tool result format
expect(message.content[0]).toEqual({
  type: "tool_result",
  tool_use_id: "call_123",
  content: "Tool response",
});

// Tool call format
expect(message.content[1]).toEqual({
  type: "tool_use",
  id: "call_123",
  name: "tool_name",
  input: { param: "value" },
});
```

### Google AI Provider Tests

**Unique Features Tested:**
- **Content optimization**: Single message string vs array format optimization
- **Function declarations**: Tool schemas converted to Google AI function format
- **Parts structure**: Messages structured as arrays of parts
- **System instructions**: System messages as separate config field
- **JSON argument parsing**: Automatic JSON parsing for tool arguments

**Example Test Patterns:**
```typescript
// Single message optimization
expect(result.contents).toBe("Hello, how are you?");

// Multiple message format
expect(result.contents).toEqual([
  { role: "user", parts: [{ text: "Hello" }] },
  { role: "assistant", parts: [{ text: "Hi there!" }] }
]);

// Function call format
expect(contents[1].parts[1]).toEqual({
  functionCall: {
    id: "call_1",
    name: "tool_name",
    args: { param: "value" }
  }
});
```

### OpenAI ChatCompletion Tests

**Unique Features Tested:**
- **Model parameter**: All requests include model specification
- **Tool call structure**: OpenAI-specific tool call format
- **Message flattening**: Complex content arrays flattened appropriately
- **Document inclusion**: All document types included (not filtered like Anthropic)
- **Standard OpenAI format**: Traditional ChatML message structure

**Example Test Patterns:**
```typescript
// Standard message format
expect(result.messages[0]).toEqual({
  role: "user",
  content: "Hello, how are you?",
});

// Tool call format
expect(message.toolCalls[0]).toEqual({
  type: "function",
  function: {
    name: "tool_name",
    arguments: JSON.stringify({ param: "value" }),
  },
  id: "call_123",
});
```

### OpenAI ResponsesAPI Tests

**Unique Features Tested:**
- **Instructions handling**: System messages and user instructions combined
- **Input array format**: Messages in `input` field instead of `messages`
- **Conversation ending logic**: Instructions only set when last message is from user
- **Special content types**: `input_text`, `input_image`, `input_file` types
- **Tool format**: Structured tool definitions with `strict: true`

**Example Test Patterns:**
```typescript
// Input format
expect(result.input[0]).toEqual({
  role: "user",
  content: [{
    type: "input_text",
    text: "Analyze this image"
  }, {
    type: "input_image",
    image_url: "data:image/jpeg;base64,..."
  }]
});

// Tool result format
expect(result.input[0]).toEqual({
  type: "function_call_output",
  call_id: "call_123",
  output: "Tool response"
});
```

### Ollama Provider Tests

**Unique Features Tested:**
- **Model parameter**: Model parameter included to match other providers
- **Object arguments**: Tool arguments kept as objects (not stringified)
- **Simplified content format**: Uses native Ollama API format with separate content and images fields
- **Image-only multimodal**: Only image files supported in `images` array, documents filtered out
- **Combined text and instructions**: Uses `getTextAndInstructions()` to merge text and instructions

**Example Test Patterns:**
```typescript
// Model inclusion
expect(result.model).toBe("llama2");

// Multimodal content (Ollama-specific format)
expect(message.content).toBe("Analyze this image");
expect(message.images).toEqual(["base64data=="]);

// Object arguments (Ollama-specific)
expect(message.toolCalls[0]).toEqual({
  type: "function",
  function: {
    name: "tool_name",
    arguments: { param: "value" }, // Object, not string
  },
  id: "call_123",
});

// Combined text and instructions
expect(message.content).toBe("Please analyze this data\n\nFocus on the trends");
```

## Test Data Patterns

### Mock File Objects
```typescript
const mockImageFile: FileInfo = {
  path: "/test/image.jpg",
  base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB...",
  mimeType: "image/jpeg",
  size: 1000,
  name: "image.jpg",
  type: "image",
};

const mockDocumentFile: FileInfo = {
  path: "/test/document.pdf",
  base64: "JVBERi0xLjQKJdP0zOEKMS==",
  mimeType: "application/pdf",
  size: 2000,
  name: "document.pdf",
  type: "document",
};
```

### Mock Tool Schemas
```typescript
const mockToolSchema: ToolSchema = {
  name: "get_weather",
  description: "Get current weather information",
  parameters: {
    type: "object",
    properties: {
      location: { type: "string", description: "City name" },
      units: { type: "string", enum: ["celsius", "fahrenheit"] },
    },
    required: ["location"],
  },
};
```

### Mock Tool Calls
```typescript
const toolCalls: ToolCall[] = [
  {
    id: "call_123",
    name: "get_weather",
    arguments: { location: "Boston", units: "celsius" },
  },
];
```

## Coverage Gaps Addressed

During the comprehensive review, the following gaps were identified and addressed:

### Added to Ollama Provider
- Assistant message handling tests
- File type filtering tests
- Image format support tests
- Enhanced edge case coverage

### Added to Google AI Provider
- File type filtering tests
- Assistant message handling tests
- Format support validation

### Added to OpenAI ChatCompletion
- Assistant message handling tests
- File type filtering tests
- Document type handling tests
- Enhanced edge case coverage

### Added to OpenAI ResponsesAPI
- Assistant message handling tests
- File type filtering tests
- Image format support tests

### Added to Anthropic Provider
- Conversation flow handling tests
- Malformed data handling tests
- Empty system message tests
- Tool schema validation tests

## Testing Best Practices Implemented

### 1. Consistent Test Structure
- All providers follow the same describe block organization
- Similar test names across providers for comparable functionality
- Consistent mock data usage

### 2. Comprehensive Edge Case Coverage
- Empty content arrays
- Missing tool call IDs
- Various argument formats (string vs object)
- Unsupported file types
- Malformed JSON handling

### 3. Real-World Scenario Testing
- Complete conversation flows
- Mixed content types
- Tool + multimodal combinations
- Error recovery scenarios

### 4. Provider-Specific Validation
- Format-specific assertions
- Provider API compliance
- Unique feature testing
- Implementation detail validation

## Running the Tests

```bash
# Run all tests
npm test

# Run Chat class tests
npm test -- src/ai/chat.test.ts

# Run multimodal support tests  
npm test -- src/ai/multimodal.test.ts

# Run specific provider tests
npm test -- src/ai/anthropic/provider.test.ts
npm test -- src/ai/googleai/provider.test.ts
npm test -- src/ai/openai/chatcompletion.test.ts
npm test -- src/ai/openai/responsesAPI.test.ts
npm test -- src/ai/ollama/provider.test.ts

# Run with coverage
npm test -- --coverage
```

## Maintenance Guidelines

### Adding New Providers
When adding a new LLM provider, ensure the test file includes:
1. All standard test categories listed above
2. Provider-specific format validations
3. Unique feature tests for provider-specific functionality
4. Edge case handling appropriate to the provider's API

### Updating Tests
When modifying provider implementations:
1. Update corresponding test expectations
2. Add tests for new features
3. Ensure backward compatibility testing
4. Validate cross-provider consistency where applicable

### Test Data Updates
When updating mock data:
1. Use realistic but minimal base64 strings
2. Include variety in file types and sizes
3. Test both supported and unsupported formats
4. Maintain consistency across provider tests

## Integration with CI/CD

These tests are designed to:
- Run in automated CI/CD pipelines
- Provide clear failure messages
- Complete quickly (under 1 second total runtime)
- Validate provider API compliance
- Ensure consistent behavior across all providers

The comprehensive test suite serves as both validation and documentation, ensuring that all LLM providers maintain consistent behavior while supporting their unique features and capabilities.