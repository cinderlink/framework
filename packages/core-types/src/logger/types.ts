export interface Log {
  data?: Record<string, unknown>;
  message: string;
  purpose: string;
  severity: LogSeverity;
}

export type LogSeverity = "info" | "warn" | "error" | "debug" | "trace";

export interface LoggerOptions {
  prefix?: string;
  maxLength?: number;
}
