import { describe, test, expect } from "bun:test";
import { buildSkeletons } from "../src/transform/skeleton-builder.ts";
import type { DiagramElement } from "../src/core/types.ts";

describe("Skeleton builder", () => {
  test("builds skeleton for rectangle", () => {
    const elements: DiagramElement[] = [
      {
        type: "rectangle",
        id: "r1",
        x: 10,
        y: 20,
        width: 200,
        height: 100,
      },
    ];

    const skeletons = buildSkeletons(elements) as Record<string, unknown>[];
    expect(skeletons).toHaveLength(1);
    expect(skeletons[0]!.type).toBe("rectangle");
    expect(skeletons[0]!.x).toBe(10);
    expect(skeletons[0]!.y).toBe(20);
    expect(skeletons[0]!.width).toBe(200);
    expect(skeletons[0]!.height).toBe(100);
  });

  test("builds skeleton for text", () => {
    const elements: DiagramElement[] = [
      {
        type: "text",
        x: 0,
        y: 0,
        text: "Hello",
        fontSize: 24,
      },
    ];

    const skeletons = buildSkeletons(elements) as Record<string, unknown>[];
    expect(skeletons).toHaveLength(1);
    expect(skeletons[0]!.type).toBe("text");
    expect(skeletons[0]!.text).toBe("Hello");
    expect(skeletons[0]!.fontSize).toBe(24);
  });

  test("resolves arrow bindings by ID", () => {
    const elements: DiagramElement[] = [
      { type: "rectangle", id: "a", x: 0, y: 0, width: 100, height: 50 },
      { type: "rectangle", id: "b", x: 300, y: 0, width: 100, height: 50 },
      {
        type: "arrow",
        id: "arr",
        x: 100,
        y: 25,
        start: { id: "a" },
        end: { id: "b" },
      },
    ];

    const skeletons = buildSkeletons(elements) as Record<string, unknown>[];
    expect(skeletons).toHaveLength(3);

    const arrow = skeletons[2]!;
    expect(arrow.type).toBe("arrow");
    expect((arrow.start as { id: string }).id).toBe("a");
    expect((arrow.end as { id: string }).id).toBe("b");
  });

  test("applies default style values", () => {
    const elements: DiagramElement[] = [
      { type: "rectangle", x: 0, y: 0 },
    ];

    const skeletons = buildSkeletons(elements) as Record<string, unknown>[];
    expect(skeletons[0]!.strokeColor).toBe("#1e1e1e");
    expect(skeletons[0]!.backgroundColor).toBe("transparent");
    expect(skeletons[0]!.roughness).toBe(1);
    expect(skeletons[0]!.opacity).toBe(100);
  });

  test("generates IDs when not provided", () => {
    const elements: DiagramElement[] = [
      { type: "rectangle", x: 0, y: 0 },
    ];

    const skeletons = buildSkeletons(elements) as Record<string, unknown>[];
    expect(skeletons[0]!.id).toBeDefined();
    expect(typeof skeletons[0]!.id).toBe("string");
  });
});
