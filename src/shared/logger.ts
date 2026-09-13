export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const isDev = import.meta.env.DEV;
let minLevel = isDev ? LogLevel.DEBUG : LogLevel.INFO;

function formatMessage(tag: string, level: string, args: unknown[]): unknown[] {
  return [`[GTX:${tag}]`, level, ...args];
}

export const logger = {
  setMinLevel(level: LogLevel): void {
    minLevel = level;
  },

  debug(tag: string, ...args: unknown[]): void {
    if (minLevel <= LogLevel.DEBUG) {
      console.debug(...formatMessage(tag, 'DEBUG', args));
    }
  },

  info(tag: string, ...args: unknown[]): void {
    if (minLevel <= LogLevel.INFO) {
      console.info(...formatMessage(tag, 'INFO', args));
    }
  },

  warn(tag: string, ...args: unknown[]): void {
    if (minLevel <= LogLevel.WARN) {
      console.warn(...formatMessage(tag, 'WARN', args));
    }
  },

  error(tag: string, ...args: unknown[]): void {
    if (minLevel <= LogLevel.ERROR) {
      console.error(...formatMessage(tag, 'ERROR', args));
    }
  },
};
