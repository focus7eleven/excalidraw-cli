import { resolve, dirname } from "node:path";
import { writeFileSync, unlinkSync } from "node:fs";
import { logger } from "../utils/logger.ts";
import { RenderError } from "../core/errors.ts";
import type { Theme } from "../core/types.ts";

export interface BrowserRenderOptions {
  format: "png" | "svg";
  theme?: Theme;
  background?: string;
  padding?: number;
  scale?: number;
}

export interface BrowserRenderResult {
  data: Uint8Array | string;
  format: "png" | "svg";
}

/**
 * Render Excalidraw elements directly in a real Chromium browser via Puppeteer.
 * Uses @excalidraw/utils's exportToBlob (PNG) and exportToSvg (SVG) in a
 * proper browser context, producing pixel-perfect output identical to excalidraw.com.
 */
export async function renderInBrowser(
  elements: unknown[],
  options: BrowserRenderOptions,
): Promise<BrowserRenderResult> {
  let puppeteer: typeof import("puppeteer");
  try {
    puppeteer = await import("puppeteer");
  } catch {
    throw new RenderError(
      "Puppeteer is not installed. Install it with: bun add puppeteer",
    );
  }

  const bundlePath = resolve(
    import.meta.dir,
    "../../node_modules/@excalidraw/utils/dist/prod/index.js",
  );
  const bundleUrl = `file://${bundlePath}`;

  const theme = options.theme ?? "light";
  const scale = options.scale ?? 2;
  const padding = options.padding ?? 10;
  const format = options.format;

  const appState = {
    exportWithDarkMode: theme === "dark",
    exportBackground: true,
    viewBackgroundColor:
      options.background ?? (theme === "dark" ? "#121212" : "#ffffff"),
    exportPadding: padding,
    exportScale: scale,
  };

  // Write a temp HTML file so Chromium can load it via file:// protocol
  const tmpHtml = resolve(dirname(bundlePath), "__excalidraw_render.html");
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script type="module">
import { exportToBlob, exportToSvg } from "${bundleUrl}";

window.__export = async function(elements, appState, format) {
  if (format === "svg") {
    const svgEl = await exportToSvg({ elements, appState, files: null, exportPadding: appState.exportPadding });
    return { type: "svg", data: svgEl.outerHTML };
  } else {
    const blob = await exportToBlob({
      elements,
      appState,
      files: null,
      exportPadding: appState.exportPadding,
      getDimensions: (width, height) => ({
        width: width * appState.exportScale,
        height: height * appState.exportScale,
        scale: appState.exportScale,
      }),
    });
    const buf = await blob.arrayBuffer();
    return { type: "png", data: Array.from(new Uint8Array(buf)) };
  }
};

window.__ready = true;
</script>
</body>
</html>`;

  writeFileSync(tmpHtml, html);

  let browser;
  try {
    logger.debug("Launching Puppeteer browser");
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--allow-file-access-from-files",
      ],
    });
    const page = await browser.newPage();

    page.on("console", (msg) => {
      logger.debug(`[browser] ${msg.text()}`);
    });
    page.on("pageerror", (err) => {
      logger.debug(`[browser error] ${err.message}`);
    });

    await page.goto(`file://${tmpHtml}`, {
      waitUntil: "networkidle0",
      timeout: 60000,
    });

    await page.waitForFunction("window.__ready === true", { timeout: 30000 });

    logger.debug(
      `Rendering ${elements.length} elements as ${format} in browser`,
    );

    const result = await page.evaluate(
      async (
        els: unknown[],
        state: Record<string, unknown>,
        fmt: string,
      ) => {
        return await (window as any).__export(els, state, fmt);
      },
      elements,
      appState,
      format,
    );

    if (format === "svg") {
      logger.debug("SVG export complete");
      return { data: result.data as string, format: "svg" };
    } else {
      const pngArray = new Uint8Array(result.data as number[]);
      logger.debug(`PNG export complete: ${pngArray.length} bytes`);
      return { data: pngArray, format: "png" };
    }
  } catch (err) {
    if (err instanceof RenderError) throw err;
    throw new RenderError(
      `Browser rendering failed: ${(err as Error).message}`,
      err,
    );
  } finally {
    if (browser) {
      await browser.close();
    }
    try {
      unlinkSync(tmpHtml);
    } catch {
      // ignore cleanup errors
    }
  }
}
