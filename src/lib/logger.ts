type LogLevel = "info" | "warn" | "error";

function write(level: LogLevel, message: string) {
  const entry = JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
  });
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.info(entry);
}

export const logger = {
  info: (message: string) => write("info", message),
  warn: (message: string) => write("warn", message),
  error: (message: string) => write("error", message),
};
