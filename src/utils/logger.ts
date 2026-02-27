export type LogLevel = "quiet" | "normal" | "verbose";

let currentLevel: LogLevel = "normal";

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

export function getLogLevel(): LogLevel {
  return currentLevel;
}

export const logger = {
  debug(...args: unknown[]): void {
    if (currentLevel === "verbose") {
      console.error("[debug]", ...args);
    }
  },

  info(...args: unknown[]): void {
    if (currentLevel !== "quiet") {
      console.error(...args);
    }
  },

  warn(...args: unknown[]): void {
    if (currentLevel !== "quiet") {
      console.error("[warn]", ...args);
    }
  },

  error(...args: unknown[]): void {
    console.error("[error]", ...args);
  },
};
