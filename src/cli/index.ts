import { Command } from "commander";
import { handleRender } from "./render.ts";
import { ExcalidrawCLIError } from "../core/errors.ts";
import type { Theme } from "../core/types.ts";

export function createProgram(): Command {
  const program = new Command();

  program
    .name("excalidraw-cli")
    .description("Render Excalidraw diagrams from the command line")
    .version("0.1.0");

  program
    .command("render")
    .description("Render a diagram to PNG or SVG")
    .argument("<input>", "Input file (.json, .yaml, .yml, or .excalidraw)")
    .requiredOption("-o, --output <path>", "Output file (.png or .svg)")
    .option("-t, --theme <theme>", "Theme: light (default) or dark", "light")
    .option("-s, --scale <number>", "PNG scale factor", parseFloat, 2)
    .option("-p, --padding <number>", "Export padding in px", parseInt, 10)
    .option("-b, --background <color>", "Background color")
    .option("-q, --quiet", "Suppress output", false)
    .option("-v, --verbose", "Debug logging", false)
    .action(async (input: string, opts) => {
      try {
        await handleRender(input, {
          output: opts.output as string,
          theme: opts.theme as Theme,
          scale: opts.scale as number,
          padding: opts.padding as number,
          background: opts.background as string | undefined,
          quiet: opts.quiet as boolean,
          verbose: opts.verbose as boolean,
        });
      } catch (err) {
        if (err instanceof ExcalidrawCLIError) {
          console.error(`Error [${err.code}]: ${err.message}`);
        } else {
          console.error(`Unexpected error: ${(err as Error).message}`);
          if (opts.verbose) {
            console.error(err);
          }
        }
        process.exit(1);
      }
    });

  return program;
}
