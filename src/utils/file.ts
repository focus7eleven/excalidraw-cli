import { readFile, writeFile } from "node:fs/promises";
import { extname } from "node:path";

export async function readInputFile(path: string): Promise<string> {
  return readFile(path, "utf-8");
}

export async function writeOutputFile(
  path: string,
  data: string | Buffer | Uint8Array,
): Promise<void> {
  await writeFile(path, data);
}

export function getExtension(path: string): string {
  return extname(path).toLowerCase();
}
