import { Log, LogSeverity } from "./types";

export interface LoggerInterface {
  clear(): void;
  debug(purpose: string, message: string, data?: Record<string, unknown>): void;
  error(purpose: string, message: string, data?: Record<string, unknown>): void;
  getLogCount(purpose: string): number;
  getLogs(purpose: string): Log[];
  info(purpose: string, message: string, data?: Record<string, unknown>): void;
  log(
    purpose: string,
    severity: LogSeverity,
    message: string,
    data: Record<string, unknown>
  ): void;
  purpose(id: string): SubLoggerInterface;
  trace(purpose: string, message: string, data?: Record<string, unknown>): void;
  warn(purpose: string, message: string, data?: Record<string, unknown>): void;
}

export interface SubLoggerInterface {
  clear(): void;
  debug(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
  getLogCount(): number;
  getLogs(): Log[];
  info(message: string, data?: Record<string, unknown>): void;
  log(
    severity: LogSeverity,
    message: string,
    data: Record<string, unknown>
  ): void;

  trace(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
}
