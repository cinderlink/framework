import {
  Log,
  LogSeverity,
  LoggerInterface,
  LoggerOptions,
  SubLoggerInterface,
} from "@cinderlink/core-types";

export class Logger implements LoggerInterface {
  private _logs: Record<string, Log[]> = {};
  public maxLength: number;
  public prefix: string;

  constructor(options: LoggerOptions = {}) {
    this.maxLength = options.maxLength || 1000;
    this.prefix = options.prefix || "";
  }

  private _prefixed(purpose: string) {
    return this.prefix ? `${this.prefix}/${purpose}` : purpose;
  }

  public clear(purpose: string = "default") {
    this._logs[purpose] = [];
  }

  public debug(
    purpose: string,
    message: string,
    data?: Record<string, unknown>
  ) {
    this.log(purpose, "debug", message, data);
  }

  public error(
    purpose: string,
    message: string,
    data?: Record<string, unknown>
  ) {
    this.log(purpose, "error", message, data);
  }

  public getLogCount(purpose: string): number {
    return this._logs[purpose]?.length || 0;
  }

  public getLogs(purpose: string): Log[] {
    return this._logs[purpose] || [];
  }

  public info(
    purpose: string,
    message: string,
    data?: Record<string, unknown>
  ) {
    this.log(purpose, "info", message, data);
  }

  public log(
    purpose: string,
    severity: LogSeverity,
    message: string,
    data?: Record<string, unknown>
  ) {
    const log: Log = {
      data,
      message,
      purpose: this._prefixed(purpose),
      severity,
    };
    this._logs[purpose] = this._logs[purpose] || [];
    this._logs[purpose].push(log);
    while (this._logs[purpose].length > this.maxLength) {
      this._logs[purpose].shift();
    }
  }

  public purpose(id: string): SubLoggerInterface {
    return new SubLogger(this, id);
  }

  public trace(
    purpose: string,
    message: string,
    data?: Record<string, unknown>
  ) {
    this.log(purpose, "trace", message, data);
  }

  public warn(
    purpose: string,
    message: string,
    data?: Record<string, unknown>
  ) {
    this.log(purpose, "warn", message, data);
  }
}

class SubLogger implements SubLoggerInterface {
  constructor(public logger: Logger, public purpose: string) {}

  public clear() {
    this.logger.clear(this.purpose);
  }

  public debug(message: string, data?: Record<string, unknown>) {
    this.logger.debug(this.purpose, message, data);
  }

  public error(message: string, data?: Record<string, unknown>) {
    this.logger.error(this.purpose, message, data);
  }

  public getLogCount(): number {
    return this.logger.getLogCount(this.purpose);
  }

  public getLogs(): Log[] {
    return this.logger.getLogs(this.purpose);
  }

  public info(message: string, data?: Record<string, unknown>) {
    this.logger.info(this.purpose, message, data);
  }

  public log(
    severity: LogSeverity,
    message: string,
    data?: Record<string, unknown>
  ) {
    this.logger.log(this.purpose, severity, message, data);
  }

  public trace(message: string, data?: Record<string, unknown>) {
    this.logger.trace(this.purpose, message, data);
  }

  public warn(message: string, data?: Record<string, unknown>) {
    this.logger.warn(this.purpose, message, data);
  }
}

export const logger = new Logger();
export default logger;
