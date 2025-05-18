import { MessageParam, Tool } from '@anthropic-ai/sdk/src/resources/index.js';

type PlainObject = Record<string, unknown>;
interface Stats {
    in: number;
    out: number;
}
interface Task {
    readonly type: string;
}

interface RecorderLevelFunctions {
    log: (...message: (string | unknown | Error)[]) => void;
    heading: {
        log: (...message: (string | unknown | Error)[]) => void;
    };
}
type RecorderEntry = {
    level: LogLevel;
    time: number;
    kind: VisualLevel;
    payload: PlainObject[];
};
type VisualLevel = "heading" | "body";
declare enum LogLevel {
    Trace = 10,
    Debug = 20,
    Info = 30,
    Warn = 40,
    Error = 50,
    Fatal = 60
}
interface RecorderWriter {
    handleEvent(event: RecorderEntry): void | Promise<void>;
    flush?(): Promise<void>;
}

declare class Recorder {
    instanceId: `${string}-${string}-${string}-${string}-${string}`;
    private currentLevel;
    private logs;
    private writers;
    private _debug;
    private _info;
    private _warn;
    private _error;
    constructor();
    buildMethods(): void;
    set level(level: LogLevel);
    get level(): LogLevel;
    get info(): RecorderLevelFunctions;
    get warn(): RecorderLevelFunctions;
    get error(): RecorderLevelFunctions;
    get debug(): RecorderLevelFunctions;
    subscribe(writer: RecorderWriter): void;
    unsubscribe(writer: RecorderWriter): void;
    private publish;
    private logFunction;
    private createLoggingFunction;
    getLogs(level?: LogLevel): RecorderEntry[];
    /**
     * Ensures all writers have completed their pending operations
     * Call this before exiting the process to ensure logs are written
     */
    shutdown(): Promise<void>;
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

type OllamaProviderConfig = {
    url?: string;
    model: string;
};
type AnthropicProviderConfig = {
    "api-key": string;
    model?: string;
};
type OpenAIProviderConfig = {
    "api-key": string;
    model?: string;
};
interface AIProviderConfig {
    ollama: OllamaProviderConfig;
    anthropic: AnthropicProviderConfig;
    openai: OpenAIProviderConfig;
}
interface AIProvider {
    createChatCompletionRequest(chat: Chat): AIRequest;
}
interface AIRequest {
    execute(runtime: {
        recorder?: Recorder;
    }): Promise<AIResponse>;
}
interface ToolCall {
    id: string;
    name: string;
    arguments: string;
}
type AIResponse = AISuccessResponse | AIErrorResponse;
interface AISuccessResponse {
    type: "success";
    id: string;
    reason: AIProviderStopReason;
    message: ChatItemAssistant;
    model: string;
    toolCalls?: ToolCall[];
    usage: Stats;
    raw: any;
}
interface AIErrorResponse {
    type: "error";
    error: {
        type: string;
        message: string;
    };
    usage: Stats;
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

declare class AxleError extends Error {
    readonly code: string;
    readonly id?: string;
    readonly details?: Record<string, any>;
    constructor(message: string, options?: {
        code?: string;
        id?: string;
        details?: Record<string, any>;
        cause?: Error;
    });
}

interface SerializedExecutionResponse {
    response: string;
    stats: Stats;
}
interface WorkflowResult<T = any> {
    response: T;
    stats?: Stats;
    error?: AxleError;
    success: boolean;
}

declare class Axle {
    private provider;
    private stats;
    private variables;
    private recorder;
    constructor(config: Partial<AIProviderConfig>);
    /**
     * The execute function takes in a list of Tasks
     * @param tasks
     * @returns
     */
    execute(...tasks: Task[]): Promise<WorkflowResult>;
    get logs(): RecorderEntry[];
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
    compile(variables: Record<string, string>, runtime?: {
        recorder?: Recorder;
        options?: {
            warnUnused?: boolean;
        };
    }): string;
}

interface BraveProviderConfig {
    "api-key": string;
    rateLimit?: number;
}
type ToolProviderConfig = {
    brave?: BraveProviderConfig;
};
type ServiceConfig = Partial<AIProviderConfig> & ToolProviderConfig;
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

export { type AIProvider, Axle, Instruct, type Job, type ServiceConfig as ProviderConfig, type SerializedExecutionResponse, type ToolProviderConfig };
