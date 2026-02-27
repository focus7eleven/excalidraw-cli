import { describe, test, expect } from "bun:test";
import { loadJson } from "../src/input/json-loader.ts";
import { loadYaml } from "../src/input/yaml-loader.ts";
import { loadExcalidraw } from "../src/input/excalidraw-loader.ts";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const FIXTURES = resolve(import.meta.dirname ?? __dirname, "fixtures");

describe("JSON loader", () => {
  test("loads valid JSON diagram", async () => {
    const content = await readFile(resolve(FIXTURES, "simple-rect.json"), "utf-8");
    const result = loadJson(content);
    expect(result.elements).toHaveLength(1);
    expect(result.elements[0]!.type).toBe("rectangle");
    expect(result.meta?.title).toBe("Simple Rectangle");
  });

  test("throws on invalid JSON", () => {
    expect(() => loadJson("not json")).toThrow("Invalid JSON");
  });
});

describe("YAML loader", () => {
  test("loads valid YAML diagram", async () => {
    const content = await readFile(resolve(FIXTURES, "complex-diagram.yaml"), "utf-8");
    const result = loadYaml(content);
    expect(result.elements.length).toBeGreaterThan(1);
    expect(result.meta?.title).toBe("Architecture Diagram");
  });
});

describe("Excalidraw loader", () => {
  test("loads native .excalidraw file", async () => {
    const content = await readFile(resolve(FIXTURES, "sample.excalidraw"), "utf-8");
    const result = loadExcalidraw(content);
    expect(result.input.elements.length).toBeGreaterThan(0);
    expect(result.raw).toBeDefined();
  });

  test("throws on invalid excalidraw file", () => {
    expect(() => loadExcalidraw("not json")).toThrow("not valid JSON");
  });

  test("throws on missing elements", () => {
    expect(() => loadExcalidraw('{"type": "excalidraw"}')).toThrow(
      "missing 'elements' array",
    );
  });
});
