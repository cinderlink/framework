import {
  Log,
  LogSeverity,
  LoggerInterface,
  LoggerOptions,
  SubLoggerInterface,
} from "@cinderlink/core-types";

export interface LogFilter {
  offset?: number;
  limit?: number;
  module?: string[] | string;
  severity?: LogSeverity[] | LogSeverity;
}

export class Logger implements LoggerInterface {
  public logs: Record<string, Log[]> = {};
  public maxLength: number;
  public prefix: string;

  constructor(options: LoggerOptions = {}) {
    this.maxLength = options.maxLength || 1000;
    this.prefix = options.prefix || "";
  }

  get modules() {
    return Object.keys(this.logs);
  }

  private _prefixed(module: string) {
    return this.prefix ? `${this.prefix}/${module}` : module;
  }

  public clear(module: string = "default") {
    this.logs[module] = [];
  }

  public debug(
    module: string,
    message: string,
    data?: Record<string, unknown>
  ) {
    this.log(module, "debug", message, data);
  }

  public error(
    module: string,
    message: string,
    data?: Record<string, unknown>
  ) {
    this.log(module, "error", message, data);
  }

  public getLogCount(module: string): number {
    return this.logs[module]?.length || 0;
  }

  public getLogs(module: string): Log[] {
    return this.logs[module] || [];
  }

  public info(module: string, message: string, data?: Record<string, unknown>) {
    this.log(module, "info", message, data);
  }

  public log(
    module: string,
    severity: LogSeverity,
    message: string,
    data?: Record<string, unknown>
  ) {
    const log: Log = {
      data,
      message,
      module: this._prefixed(module),
      severity,
    };
    this.logs[module] = this.logs[module] || [];
    this.logs[module].push(log);
    while (this.logs[module].length > this.maxLength) {
      this.logs[module].shift();
    }
  }

  public module(id: string): SubLoggerInterface {
    return new SubLogger(this, id);
  }

  public trace(
    module: string,
    message: string,
    data?: Record<string, unknown>
  ) {
    this.log(module, "trace", message, data);
  }

  public warn(module: string, message: string, data?: Record<string, unknown>) {
    this.log(module, "warn", message, data);
  }
}

export class SubLogger implements SubLoggerInterface {
  constructor(public logger: LoggerInterface, public module: string) {}

  public clear() {
    this.logger.clear(this.module);
  }

  public debug(message: string, data?: Record<string, unknown>) {
    this.logger.debug(this.module, message, data);
  }

  public error(message: string, data?: Record<string, unknown>) {
    this.logger.error(this.module, message, data);
  }

  public getLogCount(): number {
    return this.logger.getLogCount(this.module);
  }

  public getLogs(): Log[] {
    return this.logger.getLogs(this.module);
  }

  public info(message: string, data?: Record<string, unknown>) {
    this.logger.info(this.module, message, data);
  }

  public log(
    severity: LogSeverity,
    message: string,
    data?: Record<string, unknown>
  ) {
    this.logger.log(this.module, severity, message, data);
  }

  public trace(message: string, data?: Record<string, unknown>) {
    this.logger.trace(this.module, message, data);
  }

  public warn(message: string, data?: Record<string, unknown>) {
    this.logger.warn(this.module, message, data);
  }
}

export const logger = new Logger();
export default logger;
