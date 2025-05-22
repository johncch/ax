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
type GoogleAIProviderConfig = {
    "api-key": string;
    model?: string;
};
interface AIProviderConfig {
    ollama: OllamaProviderConfig;
    anthropic: AnthropicProviderConfig;
    openai: OpenAIProviderConfig;
    google: GoogleAIProviderConfig;
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
    arguments: string | Record<string, unknown>;
}
type AIResponse = AISuccessResponse | AIErrorResponse;
interface AISuccessResponse {
    type: "success";
    id: string;
    reason: StopReason;
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
declare enum StopReason {
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
    content?: string;
    toolCalls?: ToolCall[];
}
interface ChatItemToolCallResult {
    id: string;
    name: string;
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

declare enum ResTypes {
    String = "string",
    List = "string[]",
    Number = "number",
    Boolean = "boolean"
}
type ResTypeStrings = `${ResTypes}`;
type StringToType<S extends ResTypeStrings> = S extends ResTypes.String ? string : S extends ResTypes.List ? string[] : S extends ResTypes.Number ? number : S extends ResTypes.Boolean ? boolean : never;
type StructuredOutput<T extends Record<string, ResTypeStrings>> = {
    [K in keyof T]: StringToType<T[K]>;
};

declare abstract class AbstractInstruct<O extends Record<string, ResTypeStrings>> implements Task {
    readonly type = "instruct";
    protected _result: StructuredOutput<O> | undefined;
    prompt: string;
    system: string | null;
    inputs: Record<string, string>;
    tools: Record<string, ToolExecutable>;
    resFormat: O;
    rawResponse: string;
    finalPrompt: string;
    protected constructor(prompt: string, resFormat: O);
    setInputs(inputs: Record<string, string>): void;
    addInput(name: string, value: string): void;
    addTools(tools: ToolExecutable[]): void;
    addTool(tool: ToolExecutable): void;
    hasTools(): boolean;
    get result(): StructuredOutput<O>;
    compile(variables: Record<string, string>, runtime?: {
        recorder?: Recorder;
        options?: {
            warnUnused?: boolean;
        };
    }): string;
    protected getFinalUserPrompt(variables: Record<string, string>, runtime?: {
        recorder?: Recorder;
        options?: {
            warnUnused?: boolean;
        };
    }): string;
    protected getFormatInstructions(): string;
    /**
     *
     * @param rawValue - the raw value from the AI
     * @param taggedSections - optional, for overrides to use
     * @returns - the parsed result
     */
    finalize(rawValue: string, taggedSections?: {
        tags: Record<string, string>;
        remaining: string;
    }): StructuredOutput<O>;
    protected parseTaggedSections(input: string): {
        tags: Record<string, string>;
        remaining: string;
    };
    protected typeResponses(typeString: ResTypeStrings, rawValue: string): StringToType<ResTypes>;
}

type DefaultresFormatType = {
    response: ResTypes.String;
};
declare class Instruct<O extends Record<string, ResTypeStrings>> extends AbstractInstruct<O> {
    private constructor();
    static with<NewO extends Record<string, ResTypeStrings>>(prompt: string, resFormat: NewO): Instruct<NewO>;
    static with(prompt: string): Instruct<DefaultresFormatType>;
}

type DefaultResFormatType = {
    response: ResTypes.String;
};
declare class ChainOfThought<O extends Record<string, ResTypeStrings>> extends AbstractInstruct<O> {
    private constructor();
    static with<NewO extends Record<string, ResTypeStrings>>(prompt: string, resFormat: NewO): ChainOfThought<NewO>;
    static with(prompt: string): ChainOfThought<DefaultResFormatType>;
    compile(variables: Record<string, string>, runtime?: {
        recorder?: Recorder;
        options?: {
            warnUnused?: boolean;
        };
    }): string;
    finalize(rawValue: string): StructuredOutput<O> & {
        thinking: any;
    };
}

declare class WriteOutputTask implements Task {
    output: string;
    type: "write-to-disk";
    constructor(output: string);
}

export { type AIProvider, Axle, ChainOfThought, Instruct, type SerializedExecutionResponse, WriteOutputTask };
