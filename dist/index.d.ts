import * as z from 'zod/v4';
import z__default from 'zod/v4';

type PlainObject = Record<string, unknown>;
type ProgramOptions = {
    dryRun?: boolean;
    config?: string;
    warnUnused?: boolean;
    job?: string;
    log?: boolean;
    debug?: boolean;
    args?: string[];
};
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

interface FileInfo {
    path: string;
    base64?: string;
    content?: string;
    mimeType: string;
    size: number;
    name: string;
    type: "image" | "document" | "text";
}
type TextFileInfo = FileInfo & {
    content: string;
    base64?: never;
    type: "text";
};
type Base64FileInfo = FileInfo & {
    base64: string;
    content?: never;
    type: "image" | "document";
};

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
    addUser(message: string, instruction: string): void;
    addUser(message: string, instruction: string, files: FileInfo[]): void;
    addUser(message: string, files: FileInfo[]): any;
    addAssistant(message: string, toolCalls?: ToolCall[]): void;
    addTools(input: Array<ChatItemToolCallResult>): void;
    hasFiles(): boolean;
    latest(): ChatItem | undefined;
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
    googleai: GoogleAIProviderConfig;
}
interface AIProvider {
    get name(): string;
    get model(): string;
    createChatRequest(chat: Chat, context: {
        recorder?: Recorder;
    }): AIRequest;
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
    content: string | ChatContent[];
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
type ChatContent = ChatContentText | ChatContentFile | ChatContentInstructions;
interface ChatContentText {
    type: "text";
    text: string;
}
interface ChatContentInstructions {
    type: "instructions";
    instructions: string;
}
interface ChatContentFile {
    type: "file";
    file: FileInfo;
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

interface Planner {
    plan(tasks: Task[]): Promise<Run[]>;
}

interface Run {
    tasks: Task[];
    variables: Record<string, any>;
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
interface WorkflowExecutable {
    execute: (context: {
        provider: AIProvider;
        variables: Record<string, any>;
        options?: ProgramOptions;
        stats?: Stats;
        recorder?: Recorder;
        name?: string;
    }) => Promise<WorkflowResult>;
}
interface DAGNodeDefinition {
    task: Task | Task[];
    dependsOn?: string | string[];
}
interface DAGConcurrentNodeDefinition {
    planner: Planner;
    tasks: Task[];
    dependsOn?: string | string[];
}
interface DAGDefinition {
    [nodeName: string]: Task | Task[] | DAGNodeDefinition | DAGConcurrentNodeDefinition;
}
interface DAGWorkflowOptions {
    continueOnError?: boolean;
    maxConcurrency?: number;
}

declare class Axle {
    provider: AIProvider;
    private stats;
    private variables;
    recorder: Recorder;
    constructor(config: Partial<AIProviderConfig>);
    addWriter(writer: RecorderWriter): void;
    /**
     * The execute function takes in a list of Tasks
     * @param tasks
     * @returns
     */
    execute(...tasks: Task[]): Promise<WorkflowResult>;
    /**
     * Execute a DAG workflow
     * @param dagDefinition - The DAG definition object
     * @param variables - Additional variables to pass to the workflow
     * @param options - DAG execution options
     * @returns Promise<WorkflowResult>
     */
    executeDAG(dagDefinition: DAGDefinition, variables?: Record<string, any>, options?: DAGWorkflowOptions): Promise<WorkflowResult>;
    get logs(): RecorderEntry[];
    /**
     * Load a file with the specified encoding or auto-detect based on file extension
     * @param filePath - Path to the file
     * @param encoding - How to load the file: "utf-8" for text, "base64" for binary, or omit for auto-detection
     * @returns FileInfo object with appropriate content based on encoding
     */
    static loadFileContent(filePath: string): Promise<FileInfo>;
    static loadFileContent(filePath: string, encoding: "utf-8"): Promise<TextFileInfo>;
    static loadFileContent(filePath: string, encoding: "base64"): Promise<Base64FileInfo>;
}

declare enum ResultType {
    String = "string",
    List = "string[]",
    Number = "number",
    Boolean = "boolean"
}
type ResultTypeUnion = `${ResultType}`;
type DeclarativeSchema = {
    [key: string]: ResultTypeUnion | DeclarativeSchema | DeclarativeSchema[];
};
type OutputSchema = Record<string, z__default.ZodTypeAny>;
type InferedOutputSchema<T extends OutputSchema> = {
    [K in keyof T]: z__default.output<T[K]>;
};

declare abstract class AbstractInstruct<T extends OutputSchema> implements Task {
    readonly type = "instruct";
    prompt: string;
    system: string | null;
    inputs: Record<string, string>;
    tools: Record<string, ToolExecutable>;
    files: Base64FileInfo[];
    textReferences: Array<{
        content: string;
        name?: string;
    }>;
    instructions: string[];
    schema: T;
    rawResponse: string;
    protected _taggedSections: {
        tags: Record<string, string>;
        remaining: string;
    } | undefined;
    protected _result: InferedOutputSchema<T> | undefined;
    protected constructor(prompt: string, schema: T);
    setInputs(inputs: Record<string, string>): void;
    addInput(name: string, value: string): void;
    addTools(tools: ToolExecutable[]): void;
    addTool(tool: ToolExecutable): void;
    addImage(file: FileInfo): void;
    addDocument(file: FileInfo): void;
    addFile(file: FileInfo): void;
    addReference(textFile: FileInfo | TextFileInfo | string, options?: {
        name?: string;
    }): void;
    addInstructions(instruction: string): void;
    hasTools(): boolean;
    hasFiles(): boolean;
    get result(): InferedOutputSchema<T> | undefined;
    compile(variables: Record<string, string>, runtime?: {
        recorder?: Recorder;
        options?: {
            warnUnused?: boolean;
        };
    }): {
        message: string;
        instructions: string;
    };
    protected createUserMessage(variables: Record<string, string>, runtime?: {
        recorder?: Recorder;
        options?: {
            warnUnused?: boolean;
        };
    }): string;
    protected createInstructions(instructions?: string): string;
    protected generateFieldInstructions(key: string, schema: z.ZodTypeAny): string;
    finalize(rawValue: string, runtime?: {
        recorder?: Recorder;
    }): InferedOutputSchema<T>;
    private preprocessValue;
    protected parseTaggedSections(input: string): {
        tags: Record<string, string>;
        remaining: string;
    };
}

declare class Instruct<T extends OutputSchema> extends AbstractInstruct<T> {
    constructor(prompt: string, schema: T);
    static with<T extends OutputSchema>(prompt: string, schema: T): Instruct<T>;
    static with<T extends DeclarativeSchema>(prompt: string, schema: T): Instruct<OutputSchema>;
    static with(prompt: string): Instruct<{
        response: z.ZodString;
    }>;
}

declare class ChainOfThought<T extends OutputSchema> extends AbstractInstruct<T> {
    constructor(prompt: string, schema: T);
    static with<T extends OutputSchema>(prompt: string, schema: T): ChainOfThought<T>;
    static with<T extends DeclarativeSchema>(prompt: string, schema: T): ChainOfThought<OutputSchema>;
    static with(prompt: string): ChainOfThought<{
        response: z.ZodString;
    }>;
    createInstructions(instructions?: string): string;
    finalize(rawValue: string, runtime?: {
        recorder?: Recorder;
    }): InferedOutputSchema<T> & {
        thinking: string;
    };
}

interface WriteToDiskTask extends Task {
    type: "write-to-disk";
    output: string;
    keys: string[];
}
declare class WriteOutputTask implements WriteToDiskTask {
    output: string;
    keys: string[];
    type: "write-to-disk";
    constructor(output: string, keys?: string[]);
}

interface DAGJob {
    [name: string]: Job & {
        dependsOn?: string | string[];
    };
}
type Job = SerialJob | BatchJob;
interface SerialJob {
    tools?: string[];
    steps: Step[];
}
interface BatchJob {
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
    output?: Record<string, ResultTypeUnion>;
    replace?: Replace[];
    tools?: string[];
    images?: ImageReference[];
    documents?: DocumentReference[];
    references?: TextFileReference[];
}
interface WriteToDiskStep extends StepBase {
    uses: "write-to-disk";
    output: string;
    keys?: string | string[];
}
interface Replace {
    source: "file";
    pattern: string;
    files: string | string[];
}
interface ImageReference {
    file: string;
}
interface DocumentReference {
    file: string;
}
interface TextFileReference {
    file: string;
}

interface ConcurrentWorkflow {
    (jobConfig: BatchJob): WorkflowExecutable;
    (planner: Planner, ...instructions: Task[]): WorkflowExecutable;
}
declare const concurrentWorkflow: ConcurrentWorkflow;

interface DAGWorkflow {
    (definition: DAGDefinition | DAGJob, options?: DAGWorkflowOptions): WorkflowExecutable;
}
declare const dagWorkflow: DAGWorkflow;

interface SerialWorkflow {
    (jobConfig: SerialJob): WorkflowExecutable;
    (...instructions: Task[]): WorkflowExecutable;
}
declare const serialWorkflow: SerialWorkflow;

declare class ConsoleWriter implements RecorderWriter {
    private tasks;
    private entries;
    private truncate;
    private intervalId;
    private spinnerInterval;
    private lastRender;
    private isRendering;
    private inline;
    constructor(options?: {
        truncate?: number;
        inline?: boolean;
    });
    private startSpinner;
    private stopSpinner;
    private renderTasks;
    handleEvent(event: RecorderEntry): void;
    destroy(): void;
}

export { type AIProvider, Axle, ChainOfThought, ConsoleWriter, type DAGDefinition, type DAGWorkflowOptions, type FileInfo, Instruct, LogLevel, type SerializedExecutionResponse, WriteOutputTask, concurrentWorkflow, dagWorkflow, serialWorkflow };
