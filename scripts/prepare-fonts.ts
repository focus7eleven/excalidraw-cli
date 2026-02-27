#!/usr/bin/env bun
/**
 * Extract font files from @excalidraw/utils dist for bundling.
 */
import { copyFile, mkdir, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { existsSync } from "node:fs";

const OUTPUT_DIR = resolve(import.meta.dirname ?? __dirname, "../src/fonts/font-files");

async function findFonts(): Promise<string[]> {
  const candidates = [
    resolve("node_modules/@excalidraw/utils/dist/prod/assets"),
    resolve("node_modules/@excalidraw/utils/dist/dev/assets"),
    resolve("node_modules/@excalidraw/excalidraw/dist/prod/assets"),
    resolve("node_modules/@excalidraw/excalidraw/dist"),
    resolve("node_modules/@excalidraw/excalidraw/dist/excalidraw-assets"),
  ];

  const fontFiles: string[] = [];

  for (const dir of candidates) {
    if (!existsSync(dir)) continue;

    try {
      const files = await readdir(dir, { recursive: true });
      for (const file of files) {
        const name = typeof file === "string" ? file : file.toString();
        if (name.endsWith(".woff2") || name.endsWith(".ttf")) {
          fontFiles.push(join(dir, name));
        }
      }
    } catch {
      // skip
    }

    if (fontFiles.length > 0) break; // Use the first directory that has fonts
  }

  return fontFiles;
}

async function main() {
  console.log("Preparing fonts...");

  await mkdir(OUTPUT_DIR, { recursive: true });

  const fonts = await findFonts();

  if (fonts.length === 0) {
    console.warn("No font files found. Fonts may not render correctly.");
    console.log("You can manually place .woff2 or .ttf files in:", OUTPUT_DIR);
    return;
  }

  for (const fontPath of fonts) {
    const filename = fontPath.split("/").pop()!;
    const dest = join(OUTPUT_DIR, filename);
    await copyFile(fontPath, dest);
    console.log(`  Copied: ${filename}`);
  }

  console.log(`\nDone! ${fonts.length} font files copied to ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error("Failed to prepare fonts:", err.message);
  process.exit(1);
});
