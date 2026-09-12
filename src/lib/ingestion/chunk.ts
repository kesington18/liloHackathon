import "server-only";

export type CodeChunk = {
  filePath: string;
  chunkIndex: number;
  startLine: number;
  endLine: number;
  content: string;
};

export function chunkFileContent(
  filePath: string,
  content: string,
  chunkLines: number,
  overlapLines: number,
): CodeChunk[] {
  const lines = content.split("\n");
  const chunks: CodeChunk[] = [];

  if (lines.length === 0) return chunks;

  let start = 0;
  let chunkIndex = 0;

  while (start < lines.length) {
    const end = Math.min(start + chunkLines, lines.length);
    const slice = lines.slice(start, end).join("\n").trim();

    if (slice.length > 0) {
      chunks.push({
        filePath,
        chunkIndex,
        startLine: start + 1, // 1-indexed for humans
        endLine: end,
        content: slice,
      });
      chunkIndex++;
    }

    if (end === lines.length) break;
    start = end - overlapLines; // step forward, keep overlap
  }

  return chunks;
}