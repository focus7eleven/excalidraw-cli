import type { DiagramInput } from "../core/types.ts";
import { buildSkeletons } from "./skeleton-builder.ts";
import { convertSkeletonsToElements } from "./element-converter.ts";
import { setupDomGlobals } from "../utils/dom-globals.ts";
import { logger } from "../utils/logger.ts";

export interface TransformResult {
  elements: unknown[];
}

/**
 * Transform declarative DiagramInput into Excalidraw elements.
 * For native .excalidraw files, elements are already in the right format.
 */
export async function transformElements(
  input: DiagramInput,
  isNativeExcalidraw: boolean,
): Promise<TransformResult> {
  if (isNativeExcalidraw) {
    logger.debug("Native Excalidraw input — passing elements through directly");
    return { elements: input.elements as unknown[] };
  }

  logger.debug(`Building skeletons from ${input.elements.length} elements`);
  const skeletons = buildSkeletons(input.elements);

  // Set up jsdom globals before conversion so @excalidraw/excalidraw can be imported.
  // The official converter handles label→bound text and arrow bindings correctly.
  const { cleanup } = setupDomGlobals();
  try {
    logger.debug("Converting skeletons to Excalidraw elements");
    const elements = await convertSkeletonsToElements(skeletons);

    logger.debug(`Produced ${elements.length} Excalidraw elements`);
    return { elements };
  } finally {
    cleanup();
  }
}
