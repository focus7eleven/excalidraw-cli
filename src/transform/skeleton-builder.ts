import { nanoid } from "nanoid";
import type { DiagramElement } from "../core/types.ts";
import { ELEMENT_DEFAULTS } from "../core/defaults.ts";
import { logger } from "../utils/logger.ts";

/**
 * Build ExcalidrawElementSkeleton objects from our DiagramElement definitions.
 * These skeletons are the minimal input format for convertToExcalidrawElements().
 */
export function buildSkeletons(elements: DiagramElement[]): unknown[] {
  const idMap = new Map<string, string>();
  const elementById = new Map<string, DiagramElement>();

  // First pass: assign IDs and build lookup
  for (const el of elements) {
    const id = el.id || nanoid();
    if (el.id) {
      idMap.set(el.id, id);
      elementById.set(el.id, el);
    }
  }

  // Pre-compute edge spread: when multiple arrows leave/arrive on the same
  // edge of the same shape, distribute their start/end points along the edge
  // instead of all using the center point.
  const edgeSpreads = computeEdgeSpreads(elements, elementById);

  // Second pass: build skeletons
  return elements.map((el) => buildSkeleton(el, idMap, elementById, edgeSpreads));
}

function buildSkeleton(
  el: DiagramElement,
  idMap: Map<string, string>,
  elementById: Map<string, DiagramElement>,
  edgeSpreads: Map<string, EdgeSpread>,
): unknown {
  const id = el.id ? (idMap.get(el.id) ?? el.id) : nanoid();

  const base: Record<string, unknown> = {
    type: el.type,
    id,
    x: el.x ?? 0,
    y: el.y ?? 0,
    strokeColor: el.strokeColor ?? ELEMENT_DEFAULTS.strokeColor,
    backgroundColor: el.backgroundColor ?? ELEMENT_DEFAULTS.backgroundColor,
    fillStyle: el.fillStyle ?? ELEMENT_DEFAULTS.fillStyle,
    strokeWidth: el.strokeWidth ?? ELEMENT_DEFAULTS.strokeWidth,
    strokeStyle: el.strokeStyle ?? ELEMENT_DEFAULTS.strokeStyle,
    roughness: el.roughness ?? ELEMENT_DEFAULTS.roughness,
    opacity: el.opacity ?? ELEMENT_DEFAULTS.opacity,
    angle: el.rotation ? (el.rotation * Math.PI) / 180 : 0,
    groupIds: el.groupIds ?? [],
  };

  if (el.roundness !== undefined) {
    base.roundness = el.roundness;
  }

  switch (el.type) {
    case "rectangle":
    case "ellipse":
    case "diamond":
      return buildShape(base, el);
    case "text":
      return buildText(base, el);
    case "arrow":
    case "line":
      return buildLinear(base, el, idMap, elementById, edgeSpreads);
    case "freedraw":
      return buildFreedraw(base, el);
    case "frame":
      return buildFrame(base, el);
    case "image":
      return buildImage(base, el);
    default:
      logger.warn(`Unknown element type: ${el.type}, treating as rectangle`);
      return buildShape(base, el);
  }
}

function buildShape(
  base: Record<string, unknown>,
  el: DiagramElement,
): unknown {
  base.width = el.width ?? ELEMENT_DEFAULTS.width;
  base.height = el.height ?? ELEMENT_DEFAULTS.height;

  if (el.label) {
    base.label = {
      text: el.label.text,
      fontSize: el.label.fontSize ?? ELEMENT_DEFAULTS.fontSize,
      fontFamily: el.label.fontFamily ?? ELEMENT_DEFAULTS.fontFamily,
      textAlign: el.label.textAlign ?? ELEMENT_DEFAULTS.textAlign,
      verticalAlign: el.label.verticalAlign ?? ELEMENT_DEFAULTS.verticalAlign,
      strokeColor: el.label.strokeColor ?? (base.strokeColor as string),
    };
  }

  return base;
}

function buildText(
  base: Record<string, unknown>,
  el: DiagramElement,
): unknown {
  base.text = el.text ?? "";
  base.originalText = el.text ?? "";
  base.fontSize = el.fontSize ?? ELEMENT_DEFAULTS.fontSize;
  base.fontFamily = el.fontFamily ?? ELEMENT_DEFAULTS.fontFamily;
  base.textAlign = el.textAlign ?? "left";
  base.lineHeight = 1.25;

  // Estimate text dimensions if not provided
  const text = el.text ?? "";
  const fontSize = el.fontSize ?? ELEMENT_DEFAULTS.fontSize;
  base.width = el.width ?? Math.max(text.length * fontSize * 0.6, 10);
  base.height = el.height ?? fontSize * 1.25 * (text.split("\n").length);

  return base;
}

function buildLinear(
  base: Record<string, unknown>,
  el: DiagramElement,
  idMap: Map<string, string>,
  elementById: Map<string, DiagramElement>,
  edgeSpreads: Map<string, EdgeSpread>,
): unknown {
  if (el.points) {
    // User provided explicit points
    base.points = el.points;
  } else if (el.start?.id || el.end?.id) {
    // Has binding references — pass start/end to the skeleton and let
    // Excalidraw's convertToExcalidrawElements handle routing & binding.
    const startEl = el.start?.id ? elementById.get(el.start.id) : null;
    const endEl = el.end?.id ? elementById.get(el.end.id) : null;

    if (el.start?.id) {
      const resolvedId = idMap.get(el.start.id) ?? el.start.id;
      base.start = { id: resolvedId };
    }
    if (el.end?.id) {
      const resolvedId = idMap.get(el.end.id) ?? el.end.id;
      base.end = { id: resolvedId };
    }

    // Provide approximate points as a hint (Excalidraw may recalculate them)
    if (startEl && endEl) {
      const conn = computeConnection(startEl, endEl);
      const spread = el.id ? edgeSpreads.get(el.id) : undefined;
      if (spread) {
        applyEdgeSpread(conn, startEl, endEl, spread);
      }
      base.x = conn.startX;
      base.y = conn.startY;
      base.points = [
        [0, 0],
        [conn.endX - conn.startX, conn.endY - conn.startY],
      ];
    } else if (startEl) {
      const sx = (startEl.x ?? 0) + (startEl.width ?? ELEMENT_DEFAULTS.width);
      const sy = (startEl.y ?? 0) + (startEl.height ?? ELEMENT_DEFAULTS.height) / 2;
      base.x = sx;
      base.y = sy;
      base.points = [[0, 0], [el.width ?? ELEMENT_DEFAULTS.width, 0]];
    } else if (endEl) {
      const ex = endEl.x ?? 0;
      const ey = (endEl.y ?? 0) + (endEl.height ?? ELEMENT_DEFAULTS.height) / 2;
      base.x = el.x ?? 0;
      base.y = el.y ?? 0;
      base.points = [[0, 0], [ex - (el.x ?? 0), ey - (el.y ?? 0)]];
    }
  } else {
    // No bindings, no explicit points — default horizontal line
    base.points = [[0, 0], [el.width ?? ELEMENT_DEFAULTS.width, 0]];
  }

  if (el.type === "arrow") {
    base.startArrowhead = el.startArrowhead ?? null;
    base.endArrowhead = "endArrowhead" in el ? (el.endArrowhead ?? null) : "arrow";
  }

  if (el.label) {
    base.label = {
      text: el.label.text,
      fontSize: el.label.fontSize ?? ELEMENT_DEFAULTS.fontSize,
      fontFamily: el.label.fontFamily ?? ELEMENT_DEFAULTS.fontFamily,
      textAlign: el.label.textAlign ?? ELEMENT_DEFAULTS.textAlign,
      verticalAlign: el.label.verticalAlign ?? ELEMENT_DEFAULTS.verticalAlign,
      strokeColor: el.label.strokeColor ?? (base.strokeColor as string),
    };
  }

  // Compute width/height from points
  const points = base.points as [number, number][];
  if (points.length >= 2) {
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    base.width = Math.max(...xs) - Math.min(...xs);
    base.height = Math.max(...ys) - Math.min(...ys);
  } else {
    base.width = el.width ?? ELEMENT_DEFAULTS.width;
    base.height = el.height ?? 0;
  }

  return base;
}

// =============================================
// Connection routing
// =============================================

/**
 * Compute the best connection points between two shapes.
 *
 * Strategy: if the shapes overlap horizontally, use vertical routing
 * (bottom→top or top→bottom). If they overlap vertically, use horizontal
 * routing. Otherwise, fall back to the dominant-direction heuristic.
 */
function computeConnection(startEl: DiagramElement, endEl: DiagramElement) {
  const sw = startEl.width ?? ELEMENT_DEFAULTS.width;
  const sh = startEl.height ?? ELEMENT_DEFAULTS.height;
  const sx = startEl.x ?? 0;
  const sy = startEl.y ?? 0;

  const ew = endEl.width ?? ELEMENT_DEFAULTS.width;
  const eh = endEl.height ?? ELEMENT_DEFAULTS.height;
  const ex = endEl.x ?? 0;
  const ey = endEl.y ?? 0;

  // Center points
  const sCx = sx + sw / 2;
  const sCy = sy + sh / 2;
  const eCx = ex + ew / 2;
  const eCy = ey + eh / 2;

  // Check horizontal overlap: do X ranges intersect?
  const hOverlap = sx < ex + ew && sx + sw > ex;
  // Check vertical overlap: do Y ranges intersect?
  const vOverlap = sy < ey + eh && sy + sh > ey;

  let startX: number, startY: number, endX: number, endY: number;

  // PS: how far the arrow tail penetrates into the source shape.
  //     The SVG post-processor (fixArrowStartGaps) extends the visible stroke
  //     back to (0,0), so we only need a small penetration for visual overlap.
  // PE: how far the arrowhead tip penetrates into the target shape.
  const PS = 3;
  const PE = 5;

  if (hOverlap && !vOverlap) {
    // Shapes overlap horizontally → vertical arrow
    if (eCy > sCy) {
      startX = sCx; startY = sy + sh - PS;
      endX = eCx;   endY = ey + PE;
    } else {
      startX = sCx; startY = sy + PS;
      endX = eCx;   endY = ey + eh - PE;
    }
  } else if (vOverlap && !hOverlap) {
    // Shapes overlap vertically → horizontal arrow
    if (eCx > sCx) {
      startX = sx + sw - PS; startY = sCy;
      endX = ex + PE;        endY = eCy;
    } else {
      startX = sx + PS;      startY = sCy;
      endX = ex + ew - PE;   endY = eCy;
    }
  } else {
    // No overlap (or full overlap) → use dominant direction
    const dx = eCx - sCx;
    const dy = eCy - sCy;
    if (Math.abs(dy) >= Math.abs(dx)) {
      if (dy > 0) {
        startX = sCx; startY = sy + sh - PS;
        endX = eCx;   endY = ey + PE;
      } else {
        startX = sCx; startY = sy + PS;
        endX = eCx;   endY = ey + eh - PE;
      }
    } else {
      if (dx > 0) {
        startX = sx + sw - PS; startY = sCy;
        endX = ex + PE;        endY = eCy;
      } else {
        startX = sx + PS;      startY = sCy;
        endX = ex + ew - PE;   endY = eCy;
      }
    }
  }

  return { startX, startY, endX, endY };
}

// =============================================
// Edge spread: distribute multiple arrows along shared edges
// =============================================

type Edge = "top" | "bottom" | "left" | "right";

interface EdgeSpread {
  startFraction: number; // offset from center on exit edge (-0.4 .. +0.4)
  endFraction: number;   // offset from center on entry edge (-0.4 .. +0.4)
}

/**
 * Determine which edge of the start shape the arrow exits from.
 */
function getExitEdge(startEl: DiagramElement, endEl: DiagramElement): Edge {
  const sw = startEl.width ?? ELEMENT_DEFAULTS.width;
  const sh = startEl.height ?? ELEMENT_DEFAULTS.height;
  const sx = startEl.x ?? 0;
  const sy = startEl.y ?? 0;
  const ew = endEl.width ?? ELEMENT_DEFAULTS.width;
  const eh = endEl.height ?? ELEMENT_DEFAULTS.height;
  const ex = endEl.x ?? 0;
  const ey = endEl.y ?? 0;

  const sCx = sx + sw / 2, sCy = sy + sh / 2;
  const eCx = ex + ew / 2, eCy = ey + eh / 2;
  const hOverlap = sx < ex + ew && sx + sw > ex;
  const vOverlap = sy < ey + eh && sy + sh > ey;

  if (hOverlap && !vOverlap) {
    return eCy > sCy ? "bottom" : "top";
  } else if (vOverlap && !hOverlap) {
    return eCx > sCx ? "right" : "left";
  } else {
    const dx = eCx - sCx, dy = eCy - sCy;
    if (Math.abs(dy) >= Math.abs(dx)) {
      return dy > 0 ? "bottom" : "top";
    } else {
      return dx > 0 ? "right" : "left";
    }
  }
}

const OPPOSITE_EDGE: Record<Edge, Edge> = {
  top: "bottom", bottom: "top", left: "right", right: "left",
};

/**
 * Pre-compute edge spread fractions for all arrows with start/end bindings.
 *
 * Groups arrows by (shapeId, edge) and assigns evenly-spaced fractions
 * so they fan out instead of overlapping at the center.
 */
function computeEdgeSpreads(
  elements: DiagramElement[],
  elementById: Map<string, DiagramElement>,
): Map<string, EdgeSpread> {
  // Collect arrows with both start and end bindings
  interface ArrowInfo {
    id: string;
    startEl: DiagramElement;
    endEl: DiagramElement;
    exitEdge: Edge;
    entryEdge: Edge;
  }
  const arrows: ArrowInfo[] = [];

  for (const el of elements) {
    if (el.type !== "arrow" && el.type !== "line") continue;
    if (el.points) continue; // explicit points, skip
    if (!el.id) continue;
    const startEl = el.start?.id ? elementById.get(el.start.id) : null;
    const endEl = el.end?.id ? elementById.get(el.end.id) : null;
    if (!startEl || !endEl) continue;

    const exitEdge = getExitEdge(startEl, endEl);
    const entryEdge = OPPOSITE_EDGE[exitEdge];
    arrows.push({ id: el.id, startEl, endEl, exitEdge, entryEdge });
  }

  // Group by (sourceShapeId, exitEdge) for start distribution
  const startGroups = new Map<string, ArrowInfo[]>();
  for (const a of arrows) {
    const key = `${a.startEl.id}_${a.exitEdge}`;
    if (!startGroups.has(key)) startGroups.set(key, []);
    startGroups.get(key)!.push(a);
  }

  // Group by (targetShapeId, entryEdge) for end distribution
  const endGroups = new Map<string, ArrowInfo[]>();
  for (const a of arrows) {
    const key = `${a.endEl.id}_${a.entryEdge}`;
    if (!endGroups.has(key)) endGroups.set(key, []);
    endGroups.get(key)!.push(a);
  }

  const spreads = new Map<string, EdgeSpread>();
  const getOrCreate = (id: string): EdgeSpread => {
    if (!spreads.has(id)) spreads.set(id, { startFraction: 0, endFraction: 0 });
    return spreads.get(id)!;
  };

  // Distribute start points along exit edges
  for (const [, group] of startGroups) {
    if (group.length <= 1) continue;
    // Sort by target center position (perpendicular to exit edge)
    const isVertical = group[0].exitEdge === "top" || group[0].exitEdge === "bottom";
    group.sort((a, b) => {
      const aCenter = isVertical
        ? (a.endEl.x ?? 0) + (a.endEl.width ?? 100) / 2
        : (a.endEl.y ?? 0) + (a.endEl.height ?? 50) / 2;
      const bCenter = isVertical
        ? (b.endEl.x ?? 0) + (b.endEl.width ?? 100) / 2
        : (b.endEl.y ?? 0) + (b.endEl.height ?? 50) / 2;
      return aCenter - bCenter;
    });
    for (let i = 0; i < group.length; i++) {
      // Evenly distribute: for n=2 → -1/6, +1/6; for n=3 → -1/4, 0, +1/4
      getOrCreate(group[i].id).startFraction =
        (i + 1) / (group.length + 1) - 0.5;
    }
  }

  // Distribute end points along entry edges
  for (const [, group] of endGroups) {
    if (group.length <= 1) continue;
    const isVertical = group[0].entryEdge === "top" || group[0].entryEdge === "bottom";
    group.sort((a, b) => {
      const aCenter = isVertical
        ? (a.startEl.x ?? 0) + (a.startEl.width ?? 100) / 2
        : (a.startEl.y ?? 0) + (a.startEl.height ?? 50) / 2;
      const bCenter = isVertical
        ? (b.startEl.x ?? 0) + (b.startEl.width ?? 100) / 2
        : (b.startEl.y ?? 0) + (b.startEl.height ?? 50) / 2;
      return aCenter - bCenter;
    });
    for (let i = 0; i < group.length; i++) {
      getOrCreate(group[i].id).endFraction =
        (i + 1) / (group.length + 1) - 0.5;
    }
  }

  return spreads;
}

/**
 * Apply edge spread offsets to a computed connection.
 */
function applyEdgeSpread(
  conn: { startX: number; startY: number; endX: number; endY: number },
  startEl: DiagramElement,
  endEl: DiagramElement,
  spread: EdgeSpread,
): void {
  const exitEdge = getExitEdge(startEl, endEl);
  const entryEdge = OPPOSITE_EDGE[exitEdge];

  // Spread along start edge (scale by 0.7 to stay within 70% of edge width)
  if (spread.startFraction !== 0) {
    const sw = startEl.width ?? ELEMENT_DEFAULTS.width;
    const sh = startEl.height ?? ELEMENT_DEFAULTS.height;
    if (exitEdge === "top" || exitEdge === "bottom") {
      conn.startX += spread.startFraction * sw * 0.7;
    } else {
      conn.startY += spread.startFraction * sh * 0.7;
    }
  }

  // Spread along end edge
  if (spread.endFraction !== 0) {
    const ew = endEl.width ?? ELEMENT_DEFAULTS.width;
    const eh = endEl.height ?? ELEMENT_DEFAULTS.height;
    if (entryEdge === "top" || entryEdge === "bottom") {
      conn.endX += spread.endFraction * ew * 0.7;
    } else {
      conn.endY += spread.endFraction * eh * 0.7;
    }
  }
}

// =============================================
// Other element builders
// =============================================

function buildFreedraw(
  base: Record<string, unknown>,
  el: DiagramElement,
): unknown {
  base.points = el.points ?? [];
  base.pressures = el.pressures ?? [];
  base.simulatePressure = el.simulatePressure ?? true;
  base.width = el.width ?? 0;
  base.height = el.height ?? 0;
  return base;
}

function buildFrame(
  base: Record<string, unknown>,
  el: DiagramElement,
): unknown {
  base.width = el.width ?? 800;
  base.height = el.height ?? 600;
  base.name = el.name ?? null;
  return base;
}

function buildImage(
  base: Record<string, unknown>,
  el: DiagramElement,
): unknown {
  base.width = el.width ?? ELEMENT_DEFAULTS.width;
  base.height = el.height ?? ELEMENT_DEFAULTS.height;
  base.fileId = el.fileId;
  base.status = el.status ?? "saved";
  return base;
}

/**
 * Estimate text width for label positioning.
 * CJK characters are full-width (~1.0x fontSize), Latin chars ~0.6x.
 */
function estimateLabelWidth(text: string, fontSize: number): number {
  let width = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (
      (code >= 0x2E80 && code <= 0x9FFF) ||
      (code >= 0xF900 && code <= 0xFAFF) ||
      (code >= 0xFF00 && code <= 0xFFEF) ||
      (code >= 0x20000 && code <= 0x2FA1F)
    ) {
      width += fontSize;
    } else {
      width += fontSize * 0.6;
    }
  }
  return Math.max(width, 20);
}
