import { MessageParam, Tool } from '@anthropic-ai/sdk/src/resources/index.js';

type JsonObject = Record<string, unknown>;
declare const TaskStatus: {
    readonly Running: "running";
    readonly Success: "success";
    readonly Fail: "fail";
};
type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];
interface RecorderTaskInput {
    type: "task";
    status: TaskStatus;
    id: string;
    message: string;
}
interface RecorderLogInput {
    message: string;
    kind?: "heading" | "body";
}
type RecorderInput = RecorderTaskInput | RecorderLogInput | JsonObject;
type RecorderEntry = {
    level: LogLevel;
    time: number;
} & RecorderInput;
declare enum LogLevel {
    Trace = 10,
    Debug = 20,
    Info = 30,
    Warn = 40,
    Error = 50,
    Fatal = 60
}

type OllamaProviderConfig = {
    url: string;
    model: string;
};
type AnthropicProviderConfig = {
    "api-key": string;
    model: string;
};
type OpenAIProviderConfig = {
    "api-key": string;
    model: string;
};
interface BraveProviderConfig {
    "api-key": string;
    delay?: number;
}
type AIProviderConfig = {
    openai?: Partial<OpenAIProviderConfig> & {
        "api-key": string;
    };
    anthropic?: Partial<AnthropicProviderConfig> & {
        "api-key": string;
    };
    ollama?: Partial<OllamaProviderConfig>;
};
type ToolProviderConfig = {
    brave?: BraveProviderConfig;
};
type ProviderConfig = AIProviderConfig & ToolProviderConfig;
type Job = SerialJob | BatchJob;
interface SerialJob {
    type: "serial";
    tools?: string[];
    steps: Step[];
}
interface BatchJob {
    type: "batch";
    tools?: string[];
    batch: BatchOptions[];
    steps: Step[];
}
interface SkipOptions {
    type: "file-exist";
    pattern: string;
}
interface BatchOptions {
    type: "files";
    source: string;
    bind: string;
    ["skip-if"]?: SkipOptions[];
}
type Step = ChatStep | WriteToDiskStep;
interface StepBase {
    readonly uses: string;
}
interface ChatStep extends StepBase {
    uses: "chat";
    system?: string;
    message: string;
    replace?: Replace[];
    tools?: string[];
}
interface WriteToDiskStep extends StepBase {
    uses: "write-to-disk";
    output: string;
}
interface Replace {
    source: "file";
    pattern: string;
    files: string | string[];
}

declare class Axle {
    private provider;
    private stats;
    private variables;
    private recorder;
    constructor(config: ProviderConfig);
    execute(job: Job): Promise<any>;
    get logs(): RecorderEntry[];
}

interface ToolSchema {
    name: string;
    description: string;
    parameters: {
        type: "object";
        properties: Record<string, object>;
        required: string[];
    };
}
interface ToolExecutable {
    name: string;
    schema: ToolSchema;
    setConfig?: (config: {
        [key: string]: any;
    }) => void;
    execute: (params: {
        [key: string]: any;
    }) => Promise<string>;
}

interface Stats {
    in: number;
    out: number;
}
interface Task {
    readonly type: string;
}

declare class Instruct implements Task {
    readonly type = "instruct";
    prompt: string;
    system: string | null;
    inputs: Record<string, string>;
    outputFormat: Record<string, string>;
    tools: Record<string, ToolExecutable>;
    constructor(prompt: string, outputFormat?: Record<string, string>);
    setInputs(inputs: Record<string, string>): void;
    addInput(name: string, value: string): void;
    addTools(tools: ToolExecutable[]): void;
    addTool(tool: ToolExecutable): void;
    hasTools(): boolean;
    compile(variables: Record<string, string>, options?: {
        warnUnused?: boolean;
    }): string;
}

declare class Chat {
    system: string;
    messages: ChatItem[];
    tools: ToolSchema[];
    setToolSchemas(schemas: ToolSchema[]): void;
    addSystem(message: string): void;
    addUser(message: string): void;
    addAssistant(message: string, toolCalls?: ToolCall[]): void;
    addTools(input: Array<ChatItemToolCallResult>): void;
    toOpenAI(): {
        tools: {
            type: "function";
            function: ToolSchema;
        }[];
        messages: any[];
    };
    toAnthropic(): {
        system: string;
        messages: Array<MessageParam>;
        tools: Tool[];
    };
    toString(): string;
}

interface AIProvider {
    createChatCompletionRequest(chat: Chat): AIRequest;
}
interface AIRequest {
    execute(): Promise<AIResponse>;
}
type AIResponse = AISuccessResponse | AIErrorResponse;
interface ToolCall {
    id: string;
    name: string;
    arguments: string;
}
interface AISuccessResponse {
    type: "success";
    id: string;
    reason: AIProviderStopReason;
    message: ChatItemAssistant;
    model: string;
    toolCalls?: ToolCall[];
    usage: {
        in: number;
        out: number;
    };
    raw: any;
}
interface AIErrorResponse {
    type: "error";
    error: {
        type: string;
        message: string;
    };
    usage: {
        in: number;
        out: number;
    };
    raw: any;
}
declare enum AIProviderStopReason {
    Stop = 0,
    Length = 1,
    FunctionCall = 2,
    Error = 3
}
type ChatItem = ChatItemUser | ChatItemAssistant | ChatItemToolCall;
interface ChatItemUser {
    role: "user";
    name?: string;
    content: string;
}
interface ChatItemAssistant {
    role: "assistant";
    content: string;
    toolCalls?: ToolCall[];
}
interface ChatItemToolCallResult {
    id: string;
    content: string;
}
interface ChatItemToolCall {
    role: "tool";
    content: Array<ChatItemToolCallResult>;
}

interface SerializedExecutionResponse {
    response: string;
    stats: Stats;
}

export { type AIProvider, Axle, Instruct, type Job, type ProviderConfig, type SerializedExecutionResponse, type ToolProviderConfig };
