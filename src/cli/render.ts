import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { loadInput } from "../input/index.ts";
import { diagramInputSchema } from "../core/schema.ts";
import { transformElements } from "../transform/index.ts";
import { renderPipeline } from "../render/index.ts";
import { writeOutputFile, getExtension } from "../utils/file.ts";
import { logger, setLogLevel } from "../utils/logger.ts";
import { ExcalidrawCLIError, InputError, ValidationError } from "../core/errors.ts";
import type { RenderOptions } from "../core/types.ts";

export async function handleRender(
  inputPath: string,
  options: RenderOptions,
): Promise<void> {
  // Set log level
  if (options.quiet) {
    setLogLevel("quiet");
  } else if (options.verbose) {
    setLogLevel("verbose");
  }

  const resolvedInput = resolve(inputPath);
  const resolvedOutput = resolve(options.output);

  // Validate input file exists
  if (!existsSync(resolvedInput)) {
    throw new InputError(`Input file not found: ${resolvedInput}`);
  }

  // Validate output extension
  const outputExt = getExtension(resolvedOutput);
  if (outputExt !== ".png" && outputExt !== ".svg") {
    throw new InputError(
      `Output must be .png or .svg, got: ${outputExt}`,
    );
  }

  // Load input
  logger.info(`Loading: ${resolvedInput}`);
  const loadResult = await loadInput(resolvedInput);

  // Validate (skip validation for native excalidraw files — they use different schemas)
  if (!loadResult.isNativeExcalidraw) {
    logger.debug("Validating input against schema");
    const parsed = diagramInputSchema.safeParse(loadResult.input);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
        .join("\n");
      throw new ValidationError(`Input validation failed:\n${issues}`);
    }
    loadResult.input = parsed.data;
  }

  // Apply meta overrides
  const theme = options.theme ?? loadResult.input.meta?.theme ?? "light";
  const background =
    options.background ?? loadResult.input.meta?.background;

  // Transform
  logger.info("Transforming elements...");
  const { elements } = await transformElements(
    loadResult.input,
    loadResult.isNativeExcalidraw,
  );

  if (elements.length === 0) {
    throw new InputError("No elements to render");
  }

  // Render
  const result = await renderPipeline(elements, {
    output: resolvedOutput,
    theme,
    scale: options.scale,
    padding: options.padding,
    background,
  });

  // Write output
  await writeOutputFile(resolvedOutput, result.data);
  logger.info(`Output: ${resolvedOutput}`);
}
