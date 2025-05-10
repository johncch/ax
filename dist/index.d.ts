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

interface ToolSchema {
    name: string;
    description: string;
    parameters: {
        type: "object";
        properties: Record<string, object>;
        required: string[];
    };
}
type ToolFn = (...args: any[]) => Promise<any>;
interface ToolManager {
    tools: Record<string, ToolFn>;
    schemas: Record<string, object>;
    getSchemas: (names: string[]) => ToolSchema[];
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
type Job = AgentJob | BatchJob;
interface AgentJob {
    type: "agent";
    tools?: string[];
    variables?: Record<string, string>;
    steps: Step[];
}
interface SkipOptions {
    folder: string;
    contains: string;
}
interface BatchJob {
    type: "batch";
    tools?: string[];
    variables?: Record<string, string>;
    batch: {
        type: "files";
        input: string;
        "skip-condition"?: SkipOptions[];
    }[];
    steps: Step[];
}
type Step = ChatAction | ToolAction | ToolRespondAction | WriteToDiskAction | SaveVarAction;
interface ChatAction {
    action: "chat";
    system?: string;
    content: string;
    replace?: Replace[];
}
interface ToolAction {
    action: "tool-call";
    toolCalls: ToolCall[];
    throttle?: number;
}
interface ToolRespondAction {
    action: "tool-respond";
    toolCalls: ToolCall[];
}
interface WriteToDiskAction {
    action: "write-to-disk";
    output: string;
}
interface SaveVarAction {
    action: "save-to-variables";
    name: string;
}
type Replace = ReplaceManyFiles | ReplaceFile | ReplaceVariables;
interface ReplaceVariables {
    pattern: string;
    source?: "variables";
    name: string;
}
interface ReplaceFile {
    pattern: string;
    source: "file";
    name: string;
}
interface ReplaceManyFiles {
    pattern: string;
    source: "many-files";
    name: string | string[];
}

declare class Axle {
    private provider;
    private toolManager;
    private stats;
    private variables;
    private recorder;
    constructor(config: ProviderConfig);
    use(toolConfig: ToolProviderConfig): Axle;
    execute(job: Job): Promise<any>;
    get logs(): RecorderEntry[];
}

interface Stats {
    in: number;
    out: number;
}

interface SerializedExecutionResponse {
    response: string;
    stats: Stats;
}

export { type AIProvider, Axle, type Job, type ProviderConfig, type SerializedExecutionResponse, type ToolManager, type ToolProviderConfig };
