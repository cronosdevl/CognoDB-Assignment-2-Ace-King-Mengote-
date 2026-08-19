import { isProduction } from '../config/env.js';

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN_LEVEL: number = isProduction ? LEVEL_ORDER.info : LEVEL_ORDER.debug;

const COLOURS: Record<Level, string> = {
  debug: '[90m',
  info: '[36m',
  warn: '[33m',
  error: '[31m',
};
const RESET = '[0m';

function emit(level: Level, message: string, context?: Record<string, unknown>): void {
  if (LEVEL_ORDER[level] < MIN_LEVEL) return;

  if (isProduction) {
    const line = JSON.stringify({
      level,
      time: new Date().toISOString(),
      message,
      ...context,
    });
    (level === 'error' ? console.error : console.log)(line);
    return;
  }

  const stamp = new Date().toISOString().slice(11, 23);
  const label = `${COLOURS[level]}${level.toUpperCase().padEnd(5)}${RESET}`;
  const suffix = context && Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : '';
  (level === 'error' ? console.error : console.log)(`${stamp} ${label} ${message}${suffix}`);
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => emit('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => emit('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => emit('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => emit('error', message, context),
};
