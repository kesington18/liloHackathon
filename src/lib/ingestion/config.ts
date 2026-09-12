export const INGEST_ROOT = process.cwd();

export const INCLUDED_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".sql",
  ".md",
  ".mjs",
  ".py",
  ".go",
  ".rb",
  ".java",
  ".rs",
  ".php",
  ".c",
  ".cpp",
  ".h",
  ".cs",
  ".yaml",
  ".yml",
  ".json",
];

export const IGNORED_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "out",
  "build",
  "coverage",
  ".vercel",
  "public",
  ".claude",
+ "venv",
+ ".venv",
+ "__pycache__",
+ "dist",
+ "vendor",
]);

// Skip huge/generated files
export const MAX_FILE_SIZE_BYTES = 400 * 1024; // 400KB

// Chunking
export const CHUNK_LINES = 120;
export const CHUNK_OVERLAP_LINES = 20;

// Embeddings
export const EMBEDDING_MODEL = "gemini-embedding-001"; // configurable output dims
export const EMBED_BATCH_SIZE = 50;