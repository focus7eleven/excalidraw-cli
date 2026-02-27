import { InputError } from "../core/errors.ts";
import type { DiagramInput } from "../core/types.ts";
import { readInputFile, getExtension } from "../utils/file.ts";
import { loadJson } from "./json-loader.ts";
import { loadYaml } from "./yaml-loader.ts";
import { loadExcalidraw } from "./excalidraw-loader.ts";
import { logger } from "../utils/logger.ts";

export interface LoadResult {
  input: DiagramInput;
  isNativeExcalidraw: boolean;
  rawExcalidraw?: unknown;
}

export async function loadInput(filePath: string): Promise<LoadResult> {
  logger.debug(`Loading input from: ${filePath}`);
  const content = await readInputFile(filePath);
  const ext = getExtension(filePath);

  switch (ext) {
    case ".json": {
      const input = loadJson(content);
      // Detect if this is actually a native excalidraw file saved as .json
      const parsed = JSON.parse(content);
      if (parsed.type === "excalidraw" || (parsed.elements && parsed.version)) {
        logger.debug("Detected native Excalidraw format in .json file");
        const result = loadExcalidraw(content);
        return {
          input: result.input,
          isNativeExcalidraw: true,
          rawExcalidraw: result.raw,
        };
      }
      return { input, isNativeExcalidraw: false };
    }
    case ".yaml":
    case ".yml": {
      const input = loadYaml(content);
      return { input, isNativeExcalidraw: false };
    }
    case ".excalidraw": {
      const result = loadExcalidraw(content);
      return {
        input: result.input,
        isNativeExcalidraw: true,
        rawExcalidraw: result.raw,
      };
    }
    default:
      throw new InputError(
        `Unsupported file extension: ${ext}. Supported: .json, .yaml, .yml, .excalidraw`,
      );
  }
}
