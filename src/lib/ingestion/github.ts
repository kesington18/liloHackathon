import "server-only";

export type GithubFile = {
  path: string;
  size: number;
};

const GITHUB_API = "https://api.github.com";

export function parseRepoInput(input: string): { owner: string; repo: string } {
  const trimmed = input.trim().replace(/\.git$/, "").replace(/\/$/, "");
  const match = trimmed.match(/(?:github\.com\/)?([^\/\s]+)\/([^\/\s]+)$/);
  if (!match) {
    throw new Error(
      "Could not parse GitHub repo. Use 'owner/repo' or a full GitHub URL.",
    );
  }
  return { owner: match[1], repo: match[2] };
}

function authHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export async function getDefaultBranch(
  owner: string,
  repo: string,
  token?: string,
): Promise<string> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new Error(
      `Could not access ${owner}/${repo} (${res.status}). If it's private, provide a GitHub token.`,
    );
  }
  const data = await res.json();
  return data.default_branch as string;
}

export async function listRepoFiles(
  owner: string,
  repo: string,
  branch: string,
  token?: string,
): Promise<GithubFile[]> {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers: authHeaders(token) },
  );
  if (!res.ok) {
    throw new Error(`Could not list files for ${owner}/${repo}@${branch} (${res.status}).`);
  }
  const data = await res.json();
  const tree = (data.tree ?? []) as Array<{
    path: string;
    type: string;
    size?: number;
  }>;
  return tree
    .filter((item) => item.type === "blob")
    .map((item) => ({ path: item.path, size: item.size ?? 0 }));
}

export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  branch: string,
  token?: string,
): Promise<string | null> {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`,
    { headers: authHeaders(token) },
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (data.encoding !== "base64" || !data.content) return null;
  return Buffer.from(data.content, "base64").toString("utf-8");
}