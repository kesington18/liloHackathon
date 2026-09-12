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
  low: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(false);
  const [mapResult, setMapResult] = useState<MapResult | null>(null);
  const [findings, setFindings] = useState<SecurityFinding[] | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);

  async function runAnalysis() {
    setLoading(true);
    setMapError(null);
    setSecurityError(null);

    const secret = prompt("Enter your x-ingest-secret to run analysis:");
    if (!secret) {
      setLoading(false);
      return;
    }

    const headers = { "x-ingest-secret": secret };

    const [mapRes, securityRes] = await Promise.allSettled([
      fetch("/api/analyze/map", { method: "POST", headers }).then((r) => r.json()),
      fetch("/api/analyze/security", { method: "POST", headers }).then((r) => r.json()),
    ]);

    if (mapRes.status === "fulfilled") {
      if (mapRes.value.error) setMapError(mapRes.value.error);
      else setMapResult(mapRes.value);
    } else {
      setMapError("Request failed");
    }

    if (securityRes.status === "fulfilled") {
      if (securityRes.value.error) setSecurityError(securityRes.value.error);
      else setFindings(securityRes.value.findings);
    } else {
      setSecurityError("Request failed");
    }

    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-black dark:text-white">
          Repo Onboarding Map & Security Scan
        </h1>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="rounded-lg bg-black px-4 py-2 font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {loading ? "Analyzing…" : "Analyze Repo"}
        </button>
      </div>

      {/* --- Repo Map --- */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-black dark:text-white">
          Onboarding Map
        </h2>
        {mapError && (
          <p className="text-sm text-red-600 dark:text-red-400">{mapError}</p>
        )}
        {mapResult && (
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="mb-4 text-sm text-zinc-700 dark:text-zinc-300">
              {mapResult.overview}
            </p>
            <div className="mb-4 flex flex-wrap gap-2">
              {mapResult.techStack.map((tech) => (
                <span
                  key={tech}
                  className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {tech}
                </span>
              ))}
            </div>
            <ol className="flex flex-col gap-3">
              {mapResult.flowSteps
                .sort((a, b) => a.order - b.order)
                .map((step) => (
                  <li key={step.order} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-xs font-medium text-white dark:bg-white dark:text-black">
                      {step.order}
                    </span>
                    <div>
                      <p className="font-medium text-black dark:text-white">
                        {step.title}
                      </p>
                      <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
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
        <h2 className="mb-3 text-lg font-semibold text-black dark:text-white">
          Security Findings
        </h2>
        {securityError && (
          <p className="text-sm text-red-600 dark:text-red-400">{securityError}</p>
        )}
        {findings && findings.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No issues found.
          </p>
        )}
        {findings && findings.length > 0 && (
          <div className="flex flex-col gap-3">
            {findings.map((finding, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_STYLES[finding.severity]}`}
                  >
                    {finding.severity}
                  </span>
                  <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    {finding.file}
                    {finding.approxLine ? `:${finding.approxLine}` : ""}
                  </span>
                </div>
                <p className="mb-1 text-sm text-black dark:text-white">
                  {finding.description}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  <span className="font-medium">Fix: </span>
                  {finding.recommendation}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}