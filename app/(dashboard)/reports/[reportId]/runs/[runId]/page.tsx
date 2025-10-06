"use client";

import { useParams } from "next/navigation";

export default function RunWorkspacePage() {
  const params = useParams<{ reportId: string; runId: string }>();

  return (
    <main className="flex flex-1 flex-col gap-6 p-6 lg:p-8">
      <header className="space-y-1">
        <p className="text-sm font-medium text-slate-500">Report {params.reportId}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Run {params.runId}</h1>
      </header>
      <section className="grid flex-1 grid-rows-[2fr_1fr] gap-6">
        <div className="grid h-full grid-cols-1 gap-6 rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-slate-400 shadow-sm dark:border-slate-700 dark:bg-slate-900 md:grid-cols-2">
          Workspace layout coming soon.
        </div>
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-slate-400 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          Chat and document controls coming soon.
        </div>
      </section>
    </main>
  );
}
