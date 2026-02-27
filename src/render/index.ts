import { renderInBrowser } from "./puppeteer-engine.ts";
import type { Theme } from "../core/types.ts";
import { logger } from "../utils/logger.ts";
import { getExtension } from "../utils/file.ts";

export interface RenderPipelineOptions {
  output: string;
  theme: Theme;
  scale: number;
  padding: number;
  background?: string;
}

export interface RenderResult {
  data: string | Uint8Array;
  format: "svg" | "png";
}

/**
 * Main rendering pipeline: elements → Puppeteer (Chromium) → PNG/SVG.
 */
export async function renderPipeline(
  elements: unknown[],
  options: RenderPipelineOptions,
): Promise<RenderResult> {
  const outputExt = getExtension(options.output);
  const format = outputExt === ".svg" ? "svg" : "png";

  logger.info(`Rendering ${format.toUpperCase()} via browser...`);
  return await renderInBrowser(elements, {
    format,
    theme: options.theme,
    background: options.background,
    padding: options.padding,
    scale: options.scale,
  });
}
