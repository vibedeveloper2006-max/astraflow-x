type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

const LOG_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m',
  info: '\x1b[32m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
};

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function formatEntry(entry: LogEntry): string {
  const color = LOG_COLORS[entry.level];
  const prefix = `${color}${BOLD}[${entry.level.toUpperCase()}]${RESET}`;
  const time = `\x1b[90m${entry.timestamp}${RESET}`;
  const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
  return `${prefix} ${time} ${entry.message}${ctx}`;
}

function createEntry(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
  };
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'production') return;
    console.log(formatEntry(createEntry('debug', message, context)));
  },

  info(message: string, context?: Record<string, unknown>): void {
    console.log(formatEntry(createEntry('info', message, context)));
  },

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(formatEntry(createEntry('warn', message, context)));
  },

  error(message: string, context?: Record<string, unknown>): void {
    console.error(formatEntry(createEntry('error', message, context)));
  },
};
