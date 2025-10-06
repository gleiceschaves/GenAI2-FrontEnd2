"use client";

import { useParams } from "next/navigation";

export default function ReportRunsPage() {
  const params = useParams<{ reportId: string }>();

  return (
    <main className="flex flex-1 flex-col gap-6 p-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight">
          Report {params.reportId}
        </h1>
        <p className="text-sm text-slate-500">Previous runs and signatures will appear here.</p>
      </header>
      <section className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center text-slate-400 dark:border-slate-700 dark:bg-slate-900">
        Runs table coming soon.
      </section>
    </main>
  );
}
