import { Log, LogSeverity } from "./types";
export interface LoggerInterface {
    clear(module?: string): void;
    debug(module: string, message: string, data?: Record<string, unknown>): void;
    error(module: string, message: string, data?: Record<string, unknown>): void;
    getLogCount(module: string): number;
    getLogs(module: string): Log[];
    info(module: string, message: string, data?: Record<string, unknown>): void;
    log(module: string, severity: LogSeverity, message: string, data?: Record<string, unknown>): void;
    modules: string[];
    module(id: string): SubLoggerInterface;
    trace(module: string, message: string, data?: Record<string, unknown>): void;
    warn(module: string, message: string, data?: Record<string, unknown>): void;
}
export interface SubLoggerInterface {
    prefix?: string;
    clear(): void;
    debug(message: string, data?: Record<string, unknown>): void;
    error(message: string, data?: Record<string, unknown>): void;
    getLogCount(): number;
    getLogs(): Log[];
    info(message: string, data?: Record<string, unknown>): void;
    log(severity: LogSeverity, message: string, data?: Record<string, unknown>): void;
    trace(message: string, data?: Record<string, unknown>): void;
    warn(message: string, data?: Record<string, unknown>): void;
    submodule(id: string): SubLoggerInterface;
}
//# sourceMappingURL=interface.d.ts.map