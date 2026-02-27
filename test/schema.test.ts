import { describe, test, expect } from "bun:test";
import { diagramInputSchema } from "../src/core/schema.ts";

describe("Schema validation", () => {
  test("accepts valid rectangle element", () => {
    const result = diagramInputSchema.safeParse({
      elements: [
        {
          type: "rectangle",
          x: 0,
          y: 0,
          width: 200,
          height: 100,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  test("accepts element with label", () => {
    const result = diagramInputSchema.safeParse({
      elements: [
        {
          type: "rectangle",
          x: 0,
          y: 0,
          width: 200,
          height: 100,
          label: { text: "Hello" },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  test("accepts arrow with bindings", () => {
    const result = diagramInputSchema.safeParse({
      elements: [
        {
          type: "arrow",
          x: 0,
          y: 0,
          start: { id: "a" },
          end: { id: "b" },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  test("rejects text element without text property", () => {
    const result = diagramInputSchema.safeParse({
      elements: [
        {
          type: "text",
          x: 0,
          y: 0,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  test("rejects empty elements array", () => {
    const result = diagramInputSchema.safeParse({
      elements: [],
    });
    expect(result.success).toBe(false);
  });

  test("rejects invalid element type", () => {
    const result = diagramInputSchema.safeParse({
      elements: [
        {
          type: "invalid",
          x: 0,
          y: 0,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  test("accepts meta with theme and background", () => {
    const result = diagramInputSchema.safeParse({
      meta: {
        title: "Test",
        theme: "dark",
        background: "#000000",
      },
      elements: [
        {
          type: "rectangle",
          x: 0,
          y: 0,
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});
