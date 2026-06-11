import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { AlertCircle, ArrowLeft, ClipboardList, FileClock } from "lucide-react";

export default function JudgmentReportPage() {
  const { configId } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchReport();
  }, [configId]);

  async function fetchReport() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/judgment/configs/${configId}/report`);
      if (!res.ok) throw new Error("Failed to load report");
      setData(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="space-y-3">
              <div className="text-lg font-semibold">Unable to load report</div>
              <div className="text-sm">{error || "The report page could not be loaded."}</div>
              <Link to={`/judgment/${configId}`} className="inline-flex items-center gap-2 text-sm font-medium text-white underline">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-16 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <Link to={`/judgment/${configId}`} className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-white">{data.config.name} Report</h1>
          <p className="mt-1 text-sm text-slate-500">Raw report payloads for submissions and audit history.</p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 pt-8">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white">
            <ClipboardList className="h-4 w-4 text-blue-400" />
            Submissions
          </div>
          <pre className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs leading-6 text-slate-300">
            {JSON.stringify(data.submissions ?? [], null, 2)}
          </pre>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white">
            <FileClock className="h-4 w-4 text-blue-400" />
            Recent Audit Logs
          </div>
          <pre className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs leading-6 text-slate-300">
            {JSON.stringify(data.recentAuditLogs ?? [], null, 2)}
          </pre>
        </section>
      </main>
    </div>
  );
}
