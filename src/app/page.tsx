"use client";

import { useEffect, useRef, useState } from "react";

type SecurityFinding = {
  file: string;
  approxLine: number | null;
  severity: "low" | "medium" | "high" | "critical";
  category: string;
  description: string;
  recommendation: string;
  suggestedFix: string | null;
};

type Improvement = {
  title: string;
  category: "performance" | "code_quality" | "missing_feature" | "developer_experience" | "other";
  file: string | null;
  description: string;
  suggestedFix: string | null;
};

type FlowStep = {
  order: number;
  title: string;
  file: string;
  description: string;
};

type MapResult = {
  overview: string;
  techStack: string[];
  flowSteps: FlowStep[];
  diagram: string;
};

type RecentRepo = {
  repo: string;
  branch: string | null;
  files_scanned: number | null;
  chunks_ingested: number | null;
  created_at: string;
};

const SEVERITY_STYLES: Record<string, string> = {
  low: "bg-sky-500/10 text-sky-300 ring-1 ring-inset ring-sky-500/20",
  medium: "bg-amber-500/10 text-amber-300 ring-1 ring-inset ring-amber-500/20",
  high: "bg-orange-500/10 text-orange-300 ring-1 ring-inset ring-orange-500/20",
  critical: "bg-rose-500/10 text-rose-300 ring-1 ring-inset ring-rose-500/20",
};

const CATEGORY_STYLES: Record<string, string> = {
  performance: "bg-fuchsia-500/10 text-fuchsia-300 ring-1 ring-inset ring-fuchsia-500/20",
  code_quality: "bg-indigo-500/10 text-indigo-300 ring-1 ring-inset ring-indigo-500/20",
  missing_feature: "bg-cyan-500/10 text-cyan-300 ring-1 ring-inset ring-cyan-500/20",
  developer_experience: "bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-500/20",
  other: "bg-white/10 text-white/60 ring-1 ring-inset ring-white/10",
};

const ANALYSIS_STAGES = [
  "Reading codebase…",
  "Mapping architecture…",
  "Scanning for risks…",
  "Looking for improvements…",
];

function Skeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl bg-white/5" />
      ))}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="rounded-md bg-white/10 px-2 py-1 text-xs font-medium text-white/80 transition-colors hover:bg-white/20"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function DiagramRenderer({ diagram }: { diagram: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const mermaidModule = await import("mermaid");
        const mermaid = mermaidModule.default;
        mermaid.initialize({ startOnLoad: false, theme: "dark" });
        const id = `diagram-${Math.random().toString(36).slice(2)}`;
        const { svg } = await mermaid.render(id, diagram);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch {
        if (!cancelled) setError(true);
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [diagram]);

  if (error) {
    return (
      <pre className="overflow-x-auto rounded-lg bg-black/40 p-3 text-xs text-white/50">
        {diagram}
      </pre>
    );
  }

  return <div ref={containerRef} className="overflow-x-auto rounded-lg bg-black/20 p-4" />;
}

export default function DashboardPage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [recentRepos, setRecentRepos] = useState<RecentRepo[]>([]);

  const [ingesting, setIngesting] = useState(false);
  const [ingestInfo, setIngestInfo] = useState<string | null>(null);
  const [ingestError, setIngestError] = useState<string | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [mapResult, setMapResult] = useState<MapResult | null>(null);
  const [findings, setFindings] = useState<SecurityFinding[] | null>(null);
  const [improvements, setImprovements] = useState<Improvement[] | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [improvementsError, setImprovementsError] = useState<string | null>(null);

  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    refreshRecent();
  }, []);

  useEffect(() => {
    if (!analyzing) return;
    const interval = setInterval(() => {
      setStageIndex((i) => (i + 1) % ANALYSIS_STAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [analyzing]);

  async function refreshRecent() {
    try {
      const res = await fetch("/api/repo-history");
      const data = await res.json();
      setRecentRepos(data.recent ?? []);
    } catch {
      // non-critical — silently ignore
    }
  }

  async function runAnalysis() {
    setAnalyzing(true);
    setHasRun(true);
    setStageIndex(0);
    setMapError(null);
    setSecurityError(null);
    setImprovementsError(null);
    setMapResult(null);
    setFindings(null);
    setImprovements(null);

    try {
      const res = await fetch("/api/analyze/run", { method: "POST" });
      const data = await res.json();

      if (data.map?.error) setMapError(data.map.error);
      else setMapResult(data.map.data);

      if (data.security?.error) setSecurityError(data.security.error);
      else setFindings(data.security.data.findings);

      if (data.improvements?.error) setImprovementsError(data.improvements.error);
      else setImprovements(data.improvements.data.improvements);
    } catch {
      setMapError("Request failed");
      setSecurityError("Request failed");
      setImprovementsError("Request failed");
    } finally {
      setAnalyzing(false);
    }
  }

  async function loadRepoAndAnalyze(overrideUrl?: string) {
    const targetUrl = overrideUrl ?? repoUrl;
    if (!targetUrl.trim()) return;

    setIngesting(true);
    setIngestError(null);
    setIngestInfo(null);

    try {
      const res = await fetch("/api/ingest-remote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: targetUrl, githubToken: githubToken || undefined }),
      });
      const data = await res.json();

      if (data.error) {
        setIngestError(data.error);
        setIngesting(false);
        return;
      }

      setIngestInfo(`Loaded ${data.repo} (${data.chunksIngested} chunks from ${data.filesScanned} files)`);
      setIngesting(false);
      refreshRecent();
      await runAnalysis();
    } catch {
      setIngestError("Failed to reach the ingestion endpoint");
      setIngesting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07070b] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-128 w-lg rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute -right-40 top-1/3 h-112 w-md rounded-full bg-fuchsia-600/15 blur-[130px]" />
        <div className="absolute -bottom-48 left-1/3 h-104 w-104 rounded-full bg-cyan-500/10 blur-[130px]" />
      </div>

      <div className="relative mx-auto max-w-4xl px-6 py-16">
        <div className="mb-10">
          <h1 className="bg-linear-to-r from-white via-indigo-200 to-fuchsia-200 bg-clip-text text-3xl font-semibold tracking-tight text-transparent">
            Repo Onboarding Map & Security Scan
          </h1>
          <p className="mt-1 text-sm text-white/50">
            Point it at any GitHub repo — public or private — and get an AI-generated
            codebase walkthrough, risk scan, and improvement suggestions.
          </p>
        </div>

        <div className="mb-10 rounded-2xl border border-white/10 bg-white/3 p-5 backdrop-blur-sm">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <input
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="owner/repo or https://github.com/owner/repo"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-indigo-400/50 focus:outline-none"
            />
            <input
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="GitHub token (optional, for private repos)"
              type="password"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-indigo-400/50 focus:outline-none"
            />
            <button
              onClick={() => loadRepoAndAnalyze()}
              disabled={ingesting || analyzing || !repoUrl.trim()}
              className="whitespace-nowrap rounded-lg bg-linear-to-r from-indigo-500 to-fuchsia-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100"
            >
              {ingesting ? "Fetching repo…" : analyzing ? ANALYSIS_STAGES[stageIndex] : "Load & Analyze"}
            </button>
          </div>

          {recentRepos.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs text-white/30">Recent:</span>
              {recentRepos.map((r) => (
                <button
                  key={r.repo}
                  onClick={() => {
                    setRepoUrl(r.repo);
                    loadRepoAndAnalyze(r.repo);
                  }}
                  disabled={ingesting || analyzing}
                  className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/60 transition-colors hover:bg-white/10 disabled:opacity-40"
                >
                  {r.repo}
                </button>
              ))}
            </div>
          )}

          {ingestError && <p className="mt-3 text-sm text-rose-300">{ingestError}</p>}
          {ingestInfo && !ingestError && (
            <p className="mt-3 text-sm text-emerald-300">{ingestInfo}</p>
          )}

          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-white/30">
              Or re-analyze whatever repo is already loaded, without re-fetching.
            </p>
            <button
              onClick={() => runAnalysis()}
              disabled={analyzing || ingesting}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 disabled:opacity-40"
            >
              {analyzing ? ANALYSIS_STAGES[stageIndex] : "Re-run Analysis"}
            </button>
          </div>
        </div>

        {/* Codebase Walkthrough */}
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold text-white">Codebase Walkthrough</h2>

          {analyzing && !mapResult && <Skeleton />}
          {mapError && (
            <p className="rounded-lg bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{mapError}</p>
          )}

          {mapResult && (
            <div className="animate-fade-in-up rounded-2xl border border-white/10 bg-white/3 p-6 backdrop-blur-sm">
              <p className="mb-5 text-sm leading-relaxed text-white/70">{mapResult.overview}</p>
              <div className="mb-6 flex flex-wrap gap-2">
                {mapResult.techStack.map((tech) => (
                  <span
                    key={tech}
                    className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-200 ring-1 ring-inset ring-indigo-500/20"
                  >
                    {tech}
                  </span>
                ))}
              </div>

              <ol className="mb-6 flex flex-col gap-4">
                {mapResult.flowSteps
                  .sort((a, b) => a.order - b.order)
                  .map((step, idx) => (
                    <li
                      key={step.order}
                      className="animate-fade-in-up flex gap-4"
                      style={{ animationDelay: `${idx * 60}ms` }}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-400 to-fuchsia-400 text-xs font-semibold text-black">
                        {step.order}
                      </span>
                      <div className="border-l border-white/10 pb-1 pl-4">
                        <p className="font-medium text-white">{step.title}</p>
                        <p className="font-mono text-xs text-white/40">{step.file}</p>
                        <p className="mt-1 text-sm text-white/60">{step.description}</p>
                      </div>
                    </li>
                  ))}
              </ol>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-white/30">
                  System Diagram
                </p>
                <DiagramRenderer diagram={mapResult.diagram} />
              </div>
            </div>
          )}
        </section>

        {/* Risk Radar */}
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold text-white">Risk Radar</h2>

          {analyzing && !findings && <Skeleton />}
          {securityError && (
            <p className="rounded-lg bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{securityError}</p>
          )}
          {findings && findings.length === 0 && (
            <p className="rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              No issues found.
            </p>
          )}

          {findings && findings.length > 0 && (
            <div className="flex flex-col gap-3">
              {findings.map((finding, idx) => (
                <div
                  key={idx}
                  className="animate-fade-in-up rounded-xl border border-white/10 bg-white/3 p-5 backdrop-blur-sm transition-shadow hover:shadow-lg hover:shadow-indigo-500/5"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${SEVERITY_STYLES[finding.severity]}`}>
                      {finding.severity}
                    </span>
                    <span className="font-mono text-xs text-white/40">
                      {finding.file}
                      {finding.approxLine ? `:${finding.approxLine}` : ""}
                    </span>
                  </div>
                  <p className="mb-2 text-sm text-white/90">{finding.description}</p>
                  <p className="mb-3 text-sm text-white/60">
                    <span className="font-medium text-white/80">Fix: </span>
                    {finding.recommendation}
                  </p>
                  {finding.suggestedFix && (
                    <div className="rounded-lg border border-white/10 bg-black/40">
                      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
                        <span className="text-xs font-medium text-white/40">Suggested code fix</span>
                        <CopyButton text={finding.suggestedFix} />
                      </div>
                      <pre className="overflow-x-auto p-3 text-xs text-emerald-200/90">
                        <code>{finding.suggestedFix}</code>
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Further Improvements */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-white">Further Improvements</h2>

          {analyzing && !improvements && <Skeleton />}
          {improvementsError && (
            <p className="rounded-lg bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {improvementsError}
            </p>
          )}
          {improvements && improvements.length === 0 && (
            <p className="rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              Nothing further to suggest.
            </p>
          )}

          {improvements && improvements.length > 0 && (
            <div className="flex flex-col gap-3">
              {improvements.map((item, idx) => (
                <div
                  key={idx}
                  className="animate-fade-in-up rounded-xl border border-white/10 bg-white/3 p-5 backdrop-blur-sm transition-shadow hover:shadow-lg hover:shadow-fuchsia-500/5"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_STYLES[item.category]}`}>
                      {item.category.replace("_", " ")}
                    </span>
                    {item.file && (
                      <span className="font-mono text-xs text-white/40">{item.file}</span>
                    )}
                  </div>
                  <p className="mb-1 text-sm font-medium text-white">{item.title}</p>
                  <p className="mb-3 text-sm text-white/60">{item.description}</p>
                  {item.suggestedFix && (
                    <div className="rounded-lg border border-white/10 bg-black/40">
                      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
                        <span className="text-xs font-medium text-white/40">Suggested code</span>
                        <CopyButton text={item.suggestedFix} />
                      </div>
                      <pre className="overflow-x-auto p-3 text-xs text-cyan-200/90">
                        <code>{item.suggestedFix}</code>
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {!hasRun && !analyzing && (
            <p className="text-sm text-white/30">
              Load a repo above, or click &ldquo;Re-run Analysis&rdquo; to scan whatever&apos;s
              currently ingested.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}