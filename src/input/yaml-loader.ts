import YAML from "yaml";
import { InputError } from "../core/errors.ts";
import type { DiagramInput } from "../core/types.ts";

export function loadYaml(content: string): DiagramInput {
  try {
    return YAML.parse(content) as DiagramInput;
  } catch (err) {
    throw new InputError(`Invalid YAML: ${(err as Error).message}`, err);
  }
}
