import { InputError } from "../core/errors.ts";
import type { DiagramInput } from "../core/types.ts";

interface ExcalidrawFile {
  type?: string;
  version?: number;
  elements?: unknown[];
  appState?: {
    theme?: string;
    viewBackgroundColor?: string;
    [key: string]: unknown;
  };
  files?: Record<string, unknown>;
}

export function loadExcalidraw(content: string): {
  input: DiagramInput;
  raw: ExcalidrawFile;
} {
  let parsed: ExcalidrawFile;
  try {
    parsed = JSON.parse(content) as ExcalidrawFile;
  } catch (err) {
    throw new InputError(
      `Invalid .excalidraw file (not valid JSON): ${(err as Error).message}`,
      err,
    );
  }

  if (!parsed.elements || !Array.isArray(parsed.elements)) {
    throw new InputError(
      "Invalid .excalidraw file: missing 'elements' array",
    );
  }

  // For native excalidraw files, we pass elements through directly
  // (they are already in Excalidraw's internal format)
  return {
    input: {
      meta: {
        theme: parsed.appState?.theme === "dark" ? "dark" : "light",
        background: parsed.appState?.viewBackgroundColor,
      },
      elements: parsed.elements as DiagramInput["elements"],
    },
    raw: parsed,
  };
}
