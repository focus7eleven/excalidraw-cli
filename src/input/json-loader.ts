import { InputError } from "../core/errors.ts";
import type { DiagramInput } from "../core/types.ts";

export function loadJson(content: string): DiagramInput {
  try {
    return JSON.parse(content) as DiagramInput;
  } catch (err) {
    throw new InputError(`Invalid JSON: ${(err as Error).message}`, err);
  }
}
