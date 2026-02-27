import { nanoid } from "nanoid";
import { logger } from "../utils/logger.ts";

/**
 * Converts ExcalidrawElementSkeleton[] to full ExcalidrawElement[] using
 * the official @excalidraw/excalidraw convertToExcalidrawElements function.
 * Falls back to a manual approach if the import fails (e.g., in Bun).
 */
export async function convertSkeletonsToElements(
  skeletons: unknown[],
): Promise<unknown[]> {
  try {
    const mod = await import("@excalidraw/excalidraw");
    const convert =
      mod.convertToExcalidrawElements ??
      (mod as Record<string, unknown>).default?.convertToExcalidrawElements;

    if (typeof convert === "function") {
      logger.debug("Using @excalidraw/excalidraw convertToExcalidrawElements");
      return convert(skeletons as never) as unknown[];
    }
  } catch (err) {
    logger.debug(
      `Could not import @excalidraw/excalidraw: ${(err as Error).message}`,
    );
  }

  // Fallback: manually expand skeletons into renderable elements
  logger.debug("Using fallback element conversion");
  return expandSkeletons(skeletons as Record<string, unknown>[]);
}

/**
 * Expand skeletons by:
 * 1. Applying default fields needed by exportToSvg
 * 2. Expanding `label` into a separate bound text element
 * 3. Setting up arrow binding relationships
 */
function expandSkeletons(skeletons: Record<string, unknown>[]): Record<string, unknown>[] {
  const elements: Record<string, unknown>[] = [];
  const idToElement = new Map<string, Record<string, unknown>>();

  // First pass: create all elements and index by ID
  for (const s of skeletons) {
    const el = applyDefaults(s);
    idToElement.set(el.id as string, el);
    elements.push(el);
  }

  // Second pass: expand labels and set up bindings
  const extraElements: Record<string, unknown>[] = [];

  for (const el of elements) {
    const elType = el.type as string;
    const isLinear = elType === "arrow" || elType === "line";

    // Handle label → create bound text element
    const label = el.label as Record<string, unknown> | undefined;
    if (label && label.text) {
      const textId = nanoid();
      const containerId = el.id as string;
      const fontSize = (label.fontSize as number) ?? 20;
      const text = label.text as string;
      const textWidth = Math.max(estimateTextWidth(text, fontSize), 20);
      const textHeight = fontSize * 1.25;

      let textX: number;
      let textY: number;

      if (isLinear) {
        // For arrows/lines: position label at the midpoint of the path.
        const points = el.points as [number, number][] | undefined;
        if (points && points.length >= 2) {
          const last = points[points.length - 1]!;
          const midX = last[0] * 0.5;
          const midY = last[1] * 0.5;
          textX = (el.x as number) + midX - textWidth / 2;
          textY = (el.y as number) + midY - textHeight / 2;
        } else {
          textX = (el.x as number);
          textY = (el.y as number) - textHeight / 2;
        }
      } else {
        // For shapes: center inside the shape
        textX = (el.x as number) + ((el.width as number) ?? 200) / 2 - textWidth / 2;
        textY = (el.y as number) + ((el.height as number) ?? 100) / 2 - textHeight / 2;
      }

      const textEl: Record<string, unknown> = {
        id: textId,
        type: "text",
        x: textX,
        y: textY,
        width: textWidth,
        height: textHeight,
        angle: el.angle ?? 0,
        strokeColor: (label.strokeColor as string) ?? (el.strokeColor as string) ?? "#1e1e1e",
        backgroundColor: "transparent",
        fillStyle: "solid",
        strokeWidth: 0,
        strokeStyle: "solid",
        roughness: 0,
        opacity: el.opacity ?? 100,
        groupIds: (el.groupIds as string[]) ?? [],
        roundness: null,
        text,
        fontSize,
        fontFamily: (label.fontFamily as number) ?? 1,
        textAlign: (label.textAlign as string) ?? "center",
        verticalAlign: (label.verticalAlign as string) ?? "middle",
        containerId,
        originalText: text,
        autoResize: true,
        lineHeight: 1.25,
        ...commonDefaults(),
      };

      // Mark the parent element as having a bound text element
      el.boundElements = [
        ...((el.boundElements as unknown[]) ?? []),
        { id: textId, type: "text" },
      ];

      extraElements.push(textEl);
      delete el.label;
    }

    // Keep start/end binding references for the Excalidraw renderer —
    // it will handle arrow routing and endpoint calculation in the browser.
  }

  return [...elements, ...extraElements];
}

function commonDefaults(): Record<string, unknown> {
  return {
    version: 1,
    versionNonce: Math.floor(Math.random() * 2147483647),
    updated: Date.now(),
    isDeleted: false,
    link: null,
    locked: false,
    seed: Math.floor(Math.random() * 2147483647),
  };
}

function applyDefaults(el: Record<string, unknown>): Record<string, unknown> {
  return {
    ...commonDefaults(),
    boundElements: null,
    ...el,
    angle: el.angle ?? 0,
    groupIds: (el.groupIds as string[]) ?? [],
  };
}

/**
 * Unbind text labels from arrow/line containers and reposition them
 * at the visible center of the arrow/line path.
 *
 * The official converter creates bound text (containerId → arrow). But
 * exportToSvg ignores our position overrides and recalculates from geometry,
 * centering at 50% of the definition path. Since rough.js truncates the first
 * ~40%, the visible center is at 70%. We can't override exportToSvg's
 * positioning, so instead we unbind the text (remove containerId) and position
 * it as a standalone element at the correct visible center.
 */
function unbindAndCenterLinearLabels(elements: Record<string, unknown>[]): void {
  const MID = 0.5;

  const byId = new Map<string, Record<string, unknown>>();
  for (const el of elements) {
    if (el.id) byId.set(el.id as string, el);
  }

  for (const el of elements) {
    if (el.type !== "text" || !el.containerId) continue;

    const container = byId.get(el.containerId as string);
    if (!container) continue;

    const cType = container.type as string;
    if (cType !== "arrow" && cType !== "line") continue;

    const points = container.points as [number, number][] | undefined;
    if (!points || points.length < 2) continue;

    const first = points[0]!;
    const last = points[points.length - 1]!;
    const containerX = container.x as number;
    const containerY = container.y as number;

    // Midpoint in absolute coordinates
    const visMidX = containerX + first[0] + (last[0] - first[0]) * MID;
    const visMidY = containerY + first[1] + (last[1] - first[1]) * MID;

    // Position text centered on visible midpoint
    const textWidth = el.width as number;
    const textHeight = el.height as number;
    el.x = visMidX - textWidth / 2;
    el.y = visMidY - textHeight / 2;

    // Unbind: remove containerId so exportToSvg renders it as standalone text
    const textId = el.id as string;
    delete el.containerId;

    // Remove from container's boundElements
    const bound = container.boundElements as { id: string; type: string }[] | null;
    if (bound) {
      container.boundElements = bound.filter((b) => b.id !== textId);
    }
  }
}
