"use client";

import { useState } from "react";

type SecurityFinding = {
  file: string;
  approxLine: number | null;
  severity: "low" | "medium" | "high" | "critical";
  category: string;
  description: string;
  recommendation: string;
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
};

const SEVERITY_STYLES: Record<string, string> = {
  low: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20",
  medium:
    "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
  high: "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20",
  critical:
    "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20",
};

function Skeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800/60"
        />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [mapResult, setMapResult] = useState<MapResult | null>(null);
  const [findings, setFindings] = useState<SecurityFinding[] | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);

  async function runAnalysis() {
    setLoading(true);
    setHasRun(true);
    setMapError(null);
    setSecurityError(null);
    setMapResult(null);
    setFindings(null);

    try {
      const res = await fetch("/api/analyze/run", { method: "POST" });
      const data = await res.json();

      if (data.map?.error) setMapError(data.map.error);
      else setMapResult(data.map.data);

      if (data.security?.error) setSecurityError(data.security.error);
      else setFindings(data.security.data.findings);
    } catch {
      setMapError("Request failed");
      setSecurityError("Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-black dark:to-zinc-950">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-12 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="bg-gradient-to-r from-zinc-900 to-zinc-600 bg-clip-text text-3xl font-semibold tracking-tight text-transparent dark:from-white dark:to-zinc-400">
              Repo Onboarding Map & Security Scan
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              AI-generated architecture walkthrough and vulnerability scan
            </p>
          </div>
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:scale-[1.02] hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 dark:bg-white dark:text-black"
          >
            {loading ? "Analyzing…" : "Analyze Repo"}
          </button>
        </div>

        {/* --- Onboarding Map --- */}
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold text-black dark:text-white">
            Onboarding Map
          </h2>

          {loading && !mapResult && <Skeleton />}

          {mapError && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
              {mapError}
            </p>
          )}

          {mapResult && (
            <div className="animate-fade-in-up rounded-2xl border border-zinc-200/70 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/60">
              <p className="mb-5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {mapResult.overview}
              </p>
              <div className="mb-6 flex flex-wrap gap-2">
                {mapResult.techStack.map((tech) => (
                  <span
                    key={tech}
                    className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    {tech}
                  </span>
                ))}
              </div>
              <ol className="flex flex-col gap-4">
                {mapResult.flowSteps
                  .sort((a, b) => a.order - b.order)
                  .map((step, idx) => (
                    <li
                      key={step.order}
                      className="animate-fade-in-up flex gap-4"
                      style={{ animationDelay: `${idx * 60}ms` }}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black text-xs font-semibold text-white dark:bg-white dark:text-black">
                        {step.order}
                      </span>
                      <div className="border-l border-zinc-200 pb-1 pl-4 dark:border-zinc-800">
                        <p className="font-medium text-black dark:text-white">
                          {step.title}
                        </p>
                        <p className="font-mono text-xs text-zinc-500 dark:text-zinc-500">
                          {step.file}
                        </p>
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                          {step.description}
                        </p>
                      </div>
                    </li>
                  ))}
              </ol>
            </div>
          )}
        </section>

        {/* --- Security Findings --- */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-black dark:text-white">
            Security Findings
          </h2>

          {loading && !findings && <Skeleton />}

          {securityError && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
              {securityError}
            </p>
          )}

          {findings && findings.length === 0 && (
            <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-500/10 dark:text-green-300">
              No issues found.
            </p>
          )}

          {findings && findings.length > 0 && (
            <div className="flex flex-col gap-3">
              {findings.map((finding, idx) => (
                <div
                  key={idx}
                  className="animate-fade-in-up rounded-xl border border-zinc-200/70 bg-white/70 p-5 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${SEVERITY_STYLES[finding.severity]}`}
                    >
                      {finding.severity}
                    </span>
                    <span className="font-mono text-xs text-zinc-500 dark:text-zinc-500">
                      {finding.file}
                      {finding.approxLine ? `:${finding.approxLine}` : ""}
                    </span>
                  </div>
                  <p className="mb-2 text-sm text-black dark:text-white">
                    {finding.description}
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      Fix:{" "}
                    </span>
                    {finding.recommendation}
                  </p>
                </div>
              ))}
            </div>
          )}

          {!hasRun && !loading && (
            <p className="text-sm text-zinc-400 dark:text-zinc-600">
              Click &ldquo;Analyze Repo&rdquo; to run the scan.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}