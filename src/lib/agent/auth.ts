import "server-only";

export function checkAnalyzeAuth(request: Request): boolean {
  const provided = request.headers.get("x-ingest-secret");
  return Boolean(process.env.INGEST_SECRET) && provided === process.env.INGEST_SECRET;
}