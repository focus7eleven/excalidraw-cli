import { JSDOM } from "jsdom";

let refCount = 0;
let dom: JSDOM | null = null;
let saved: Record<string, unknown> = {};

const KEYS = [
  "window", "document", "navigator", "HTMLElement", "Element",
  "DOMParser", "XMLSerializer", "devicePixelRatio", "FontFace", "Image",
];

/**
 * Set up jsdom globals required by @excalidraw packages.
 * Reference-counted: multiple callers can setup/cleanup independently.
 */
export function setupDomGlobals(): { cleanup: () => void } {
  refCount++;
  if (refCount > 1) {
    // Already set up — return no-op cleanup that decrements
    return { cleanup: () => { refCount--; } };
  }

  dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
    pretendToBeVisual: true,
    url: "http://localhost",
  });

  const g = globalThis as Record<string, unknown>;

  // Save originals
  saved = {};
  for (const k of KEYS) {
    saved[k] = g[k];
  }

  // Set globals
  g.window = dom.window;
  g.document = dom.window.document;
  g.navigator = dom.window.navigator;
  g.HTMLElement = dom.window.HTMLElement;
  g.Element = dom.window.Element;
  g.DOMParser = dom.window.DOMParser;
  g.XMLSerializer = dom.window.XMLSerializer;
  g.devicePixelRatio = 1;
  g.Image = dom.window.Image;

  // FontFace polyfill
  g.FontFace = class FontFace {
    family: string;
    source: string;
    unicodeRange: string;
    style: string;
    weight: string;
    loaded: Promise<FontFace>;
    status: string;
    constructor(family: string, source: string, descriptors?: Record<string, string>) {
      this.family = family;
      this.source = typeof source === "string" ? source : "";
      this.unicodeRange = descriptors?.unicodeRange ?? "U+0-10FFFF";
      this.style = descriptors?.style ?? "normal";
      this.weight = descriptors?.weight ?? "400";
      this.status = "loaded";
      this.loaded = Promise.resolve(this as unknown as FontFace);
    }
    load() {
      return Promise.resolve(this as unknown as FontFace);
    }
  } as unknown as typeof FontFace;

  // document.fonts polyfill
  if (dom.window.document && !(dom.window.document as unknown as Record<string, unknown>).fonts) {
    (dom.window.document as unknown as Record<string, unknown>).fonts = {
      add() {},
      delete() {},
      has() { return false; },
      forEach() {},
      entries() { return [][Symbol.iterator](); },
      keys() { return [][Symbol.iterator](); },
      values() { return [][Symbol.iterator](); },
      [Symbol.iterator]() { return [][Symbol.iterator](); },
      ready: Promise.resolve(),
      size: 0,
    };
  }

  const cleanup = () => {
    refCount--;
    if (refCount <= 0) {
      refCount = 0;
      for (const k of KEYS) {
        g[k] = saved[k];
      }
      dom?.window.close();
      dom = null;
    }
  };

  return { cleanup };
}
