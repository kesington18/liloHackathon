import "server-only";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import {
  IGNORED_DIRS,
  INCLUDED_EXTENSIONS,
  INGEST_ROOT,
  MAX_FILE_SIZE_BYTES,
} from "./config";

export async function walkRepoFiles(
  dir: string = INGEST_ROOT,
): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".env.example") {
      // allow dotfiles like .env.example to be skipped by extension filter anyway
    }

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      files.push(...(await walkRepoFiles(fullPath)));
      continue;
    }

    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name);
    if (!INCLUDED_EXTENSIONS.includes(ext)) continue;

    const stats = await stat(fullPath);
    if (stats.size > MAX_FILE_SIZE_BYTES) continue;

    files.push(fullPath);
  }

  return files;
}