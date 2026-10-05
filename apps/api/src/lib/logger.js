const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

function currentLevel() {
  const name = (process.env.LOG_LEVEL || 'info').toLowerCase();
  return LEVELS[name] ?? LEVELS.info;
}

function emit(level, message, meta) {
  if ((LEVELS[level] ?? 99) > currentLevel()) return;
  const line = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...(meta && typeof meta === 'object' ? meta : meta != null ? { meta } : {}),
  };
  const text = JSON.stringify(line);
  if (level === 'error') console.error(text);
  else if (level === 'warn') console.warn(text);
  else console.log(text);
}

export const logger = {
  error: (message, meta) => emit('error', message, meta),
  warn: (message, meta) => emit('warn', message, meta),
  info: (message, meta) => emit('info', message, meta),
  debug: (message, meta) => emit('debug', message, meta),
};
