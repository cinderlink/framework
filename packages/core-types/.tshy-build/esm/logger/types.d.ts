export interface Log {
    data?: Record<string, unknown>;
    message: string;
    module: string;
    severity: LogSeverity;
    expand?: boolean;
}
export type LogSeverity = "info" | "warn" | "error" | "debug" | "trace";
export interface LoggerOptions {
    prefix?: string;
    maxLength?: number;
}
//# sourceMappingURL=types.d.ts.map