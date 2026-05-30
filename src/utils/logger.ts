import * as fs from 'fs';
import * as path from 'path';
import { getConfig } from '../config';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private level: LogLevel;
  private fileStream?: fs.WriteStream;

  constructor() {
    this.level = getConfig().logLevel;
    const logFile = getConfig().logFile;
    if (logFile) {
      const dir = path.dirname(logFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      this.fileStream = fs.createWriteStream(logFile, { flags: 'a' });
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVELS[level] >= LEVELS[this.level];
  }

  private format(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  private write(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;
    const line = this.format(level, message, meta);
    if (this.fileStream) {
      this.fileStream.write(line + '\n');
    }
    // Also stderr for errors, stdout for others
    if (level === 'error') {
      process.stderr.write(line + '\n');
    } else if (level === 'warn') {
      process.stderr.write(line + '\n');
    } else {
      process.stdout.write(line + '\n');
    }
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.write('debug', message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.write('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.write('warn', message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.write('error', message, meta);
  }

  close(): void {
    this.fileStream?.end();
  }
}

// Singleton
let instance: Logger | null = null;

export function getLogger(): Logger {
  if (!instance) instance = new Logger();
  return instance;
}

export function resetLogger(): void {
  instance?.close();
  instance = null;
}
