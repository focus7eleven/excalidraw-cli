import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { existsSync } from "node:fs";
import { logger } from "../utils/logger.ts";

const FONT_DIR = resolve(import.meta.dirname ?? __dirname, "font-files");

interface FontDef {
  family: string;
  filenames: string[];
  weight?: number;
  style?: string;
}

const FONT_DEFS: FontDef[] = [
  { family: "Virgil", filenames: ["Virgil.woff2", "Virgil.ttf"] },
  { family: "Excalifont", filenames: ["Excalifont.woff2", "Excalifont.ttf"] },
  { family: "Cascadia", filenames: ["CascadiaCode.woff2", "Cascadia Code.ttf"] },
  { family: "Comic Shanns", filenames: ["Comic Shanns Regular.ttf"] },
  { family: "Liberation Sans", filenames: ["Liberation Sans.ttf"] },
  { family: "Lilita One", filenames: ["Lilita One.ttf"] },
  { family: "Nunito", filenames: ["Nunito ExtraLight Medium.ttf"] },
];

function detectFormat(filename: string): { mime: string; format: string } {
  if (filename.endsWith(".woff2")) return { mime: "font/woff2", format: "woff2" };
  return { mime: "font/ttf", format: "truetype" };
}

/**
 * Generate CSS @font-face rules with base64-encoded font data for embedding in SVG.
 */
export async function generateFontCSS(): Promise<string> {
  const rules: string[] = [];

  for (const def of FONT_DEFS) {
    let loaded = false;
    for (const filename of def.filenames) {
      const fontPath = join(FONT_DIR, filename);
      if (!existsSync(fontPath)) continue;

      try {
        const data = await readFile(fontPath);
        const base64 = data.toString("base64");
        const { mime, format } = detectFormat(filename);
        rules.push(`
@font-face {
  font-family: "${def.family}";
  src: url("data:${mime};base64,${base64}") format("${format}");
  font-weight: ${def.weight ?? 400};
  font-style: ${def.style ?? "normal"};
  font-display: swap;
}`);
        loaded = true;
        break;
      } catch (err) {
        logger.debug(
          `Failed to read font ${filename}: ${(err as Error).message}`,
        );
      }
    }
    if (!loaded) {
      logger.debug(`Font not found for family: ${def.family}`);
    }
  }

  return rules.join("\n");
}

/**
 * Get paths to all font files (for resvg which loads them separately).
 */
export async function getFontFilePaths(): Promise<string[]> {
  const paths: string[] = [];

  if (!existsSync(FONT_DIR)) {
    logger.warn(`Font directory not found: ${FONT_DIR}`);
    return paths;
  }

  try {
    const files = await readdir(FONT_DIR);
    for (const file of files) {
      if (file.endsWith(".woff2") || file.endsWith(".ttf")) {
        paths.push(join(FONT_DIR, file));
      }
    }
  } catch (err) {
    logger.warn(`Failed to read font directory: ${(err as Error).message}`);
  }

  return paths;
}

/**
 * Get raw font file data as buffers (for resvg fontBuffers option).
 */
export async function getFontBuffers(): Promise<Buffer[]> {
  const buffers: Buffer[] = [];
  const paths = await getFontFilePaths();

  for (const p of paths) {
    try {
      const buf = await readFile(p);
      buffers.push(buf);
      logger.debug(`Loaded font: ${p}`);
    } catch (err) {
      logger.debug(`Failed to read font ${p}: ${(err as Error).message}`);
    }
  }

  return buffers;
}
