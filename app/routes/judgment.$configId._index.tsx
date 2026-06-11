import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { AlertCircle, ArrowLeft, BarChart3, ClipboardList, FileJson, Settings2 } from "lucide-react";

const cardClass = "rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl";
const panelClass = "rounded-2xl border border-slate-800 bg-slate-950/70";
const tableHeadClass = "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500";
const tableCellClass = "px-4 py-3 text-sm text-slate-200 align-top";

export default function JudgmentConfigOverview() {
  const { configId } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [resolution, setResolution] = useState<"minute" | "hour" | "day" | "week" | "month">("day");
  const [isEditingRules, setIsEditingRules] = useState(false);
  const [editableRules, setEditableRules] = useState("");
  const [savingRules, setSavingRules] = useState(false);

  useEffect(() => {
    if (data?.config?.rules) {
      setEditableRules(data.config.rules);
    }
  }, [data]);

  async function handleSaveRules() {
    try {
      setSavingRules(true);
      const res = await fetch(`/api/judgment/configs/${configId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: config.name,
          rules: editableRules,
          inputSchema: config.inputSchema,
          outputSchema: config.outputSchema,
          criteria: config.criteria,
          variables: config.variables,
        }),
      });

      if (!res.ok) throw new Error("Failed to save rules");
      setData((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          config: {
            ...prev.config,
            rules: editableRules,
          },
        };
      });
      setIsEditingRules(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingRules(false);
    }
  }

  useEffect(() => {
    void fetchConfigData();
  }, [configId]);

  async function fetchConfigData() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/judgment/configs/${configId}/dashboard`);
      if (!res.ok) throw new Error("Failed to load judgment submissions");
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
              <div className="text-lg font-semibold">Unable to load judgment data</div>
              <div className="text-sm">{error || "The judgment page could not be loaded."}</div>
              <Link to="/judgment" className="inline-flex items-center gap-2 text-sm font-medium text-white underline">
                <ArrowLeft className="h-4 w-4" />
                Back to configs
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { config, submissions } = data;
  const dashboard = (() => {
    const subs = submissions || [];
    const compliantCount = subs.filter((item: any) => item.result?.verdict === "pass" || item.result?.verdict === "ready").length;
    const nonCompliantSubmissions = subs.filter((item: any) => item.result?.verdict !== "pass" && item.result?.verdict !== "ready");
    const missingFlags = nonCompliantSubmissions.map((submission: any) => ({
      employeeId: String(submission.inputData?.employeeId ?? submission.inputData?.repId ?? submission.inputData?.unitId ?? "Unknown"),
      verdict: submission.result?.verdict ?? "fail",
      reason: submission.result?.reason ?? "Review required",
    }));

    // Calculate minuteTrend dynamically
    const minuteTrendRecord: Record<string, { minute: string; compliant: number; total: number }> = {};
    subs.forEach((submission: any) => {
      if (!submission.createdAt) return;
      const dateObj = new Date(submission.createdAt);
      const MM = String(dateObj.getMonth() + 1).padStart(2, "0");
      const DD = String(dateObj.getDate()).padStart(2, "0");
      const hh = String(dateObj.getHours()).padStart(2, "0");
      const mm = String(dateObj.getMinutes()).padStart(2, "0");
      const minute = `${MM}-${DD} ${hh}:${mm}`;

      const entry = minuteTrendRecord[minute] ?? { minute, compliant: 0, total: 0 };
      entry.total += 1;
      if (submission.result?.verdict === "pass" || submission.result?.verdict === "ready") {
        entry.compliant += 1;
      }
      minuteTrendRecord[minute] = entry;
    });

    const minuteTrend = Object.values(minuteTrendRecord).sort((a, b) => a.minute.localeCompare(b.minute));

    return {
      compliantCount,
      nonCompliantCount: nonCompliantSubmissions.length,
      missingFlags,
      minuteTrend,
    };
  })();

  const trendData = (() => {
    if (!submissions || submissions.length === 0) return [];

    const groups: Record<string, { label: string; compliant: number; total: number }> = {};

    submissions.forEach((sub: any) => {
      if (!sub.createdAt) return;
      const date = new Date(sub.createdAt);

      let label = "";
      let groupKey = "";

      if (resolution === "minute") {
        const MM = String(date.getMonth() + 1).padStart(2, "0");
        const DD = String(date.getDate()).padStart(2, "0");
        const hh = String(date.getHours()).padStart(2, "0");
        const mm = String(date.getMinutes()).padStart(2, "0");
        groupKey = `${date.getFullYear()}-${MM}-${DD} ${hh}:${mm}`;
        label = `${MM}-${DD} ${hh}:${mm}`;
      } else if (resolution === "hour") {
        const MM = String(date.getMonth() + 1).padStart(2, "0");
        const DD = String(date.getDate()).padStart(2, "0");
        const hh = String(date.getHours()).padStart(2, "0");
        groupKey = `${date.getFullYear()}-${MM}-${DD} ${hh}:00`;
        label = `${MM}-${DD} ${hh}:00`;
      } else if (resolution === "day") {
        const MM = String(date.getMonth() + 1).padStart(2, "0");
        const DD = String(date.getDate()).padStart(2, "0");
        groupKey = `${date.getFullYear()}-${MM}-${DD}`;
        label = `${MM}-${DD}`;
      } else if (resolution === "week") {
        const sunday = new Date(date);
        const day = sunday.getDay();
        const diff = sunday.getDate() - day;
        sunday.setDate(diff);
        const MM = String(sunday.getMonth() + 1).padStart(2, "0");
        const DD = String(sunday.getDate()).padStart(2, "0");
        groupKey = `${sunday.getFullYear()}-${MM}-${DD}`;
        label = `W/o ${MM}-${DD}`;
      } else if (resolution === "month") {
        const MM = String(date.getMonth() + 1).padStart(2, "0");
        groupKey = `${date.getFullYear()}-${MM}`;
        label = `${date.getFullYear()}-${MM}`;
      }

      const entry = groups[groupKey] ?? { label, compliant: 0, total: 0 };
      entry.total += 1;
      if (sub.result?.verdict === "pass" || sub.result?.verdict === "ready") {
        entry.compliant += 1;
      }
      groups[groupKey] = entry;
    });

    return Object.entries(groups)
      .map(([key, val]) => ({
        key,
        label: val.label,
        compliant: val.compliant,
        total: val.total,
      }))
      .sort((a, b) => a.key.localeCompare(b.key));
  })();

  const inputFields = Object.keys(config.inputSchema?.properties ?? {});
  const outputFields = Object.keys(config.outputSchema?.properties ?? {});

  return (
    <div className="min-h-screen bg-slate-950 pb-16 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5">
          <div className="space-y-2">
            <Link to="/judgment" className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Back to configs
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-white">{config.name}</h1>
              <div className="font-mono text-xs text-slate-500">{config.pluginId}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to={`/judgment/${configId}/rules`} className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-700 hover:text-white">
              <Settings2 className="h-4 w-4" />
              Edit config
            </Link>
            <Link to={`/judgment/${configId}/submit`} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500">
              <ClipboardList className="h-4 w-4" />
              Submit evidence
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-6 pt-8">
        {/* SECTION 1: ANALYTICS & TRENDS (TOP) */}
        <section className="grid gap-6 lg:grid-cols-3">
          {/* Metrics Cards Grid */}
          <div className="space-y-4 lg:col-span-1">
            <div className={cardClass}>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Compliant</div>
              <div className="mt-2 text-3xl font-extrabold text-emerald-400">{dashboard.compliantCount}</div>
            </div>
            <div className={cardClass}>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Non-Compliant</div>
              <div className="mt-2 text-3xl font-extrabold text-rose-400">{dashboard.nonCompliantCount}</div>
            </div>
            <div className={cardClass}>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Total Evaluations</div>
              <div className="mt-2 text-3xl font-extrabold text-white">{submissions.length}</div>
            </div>
          </div>

          {/* Compliance Trend Chart */}
          <div className={`${cardClass} lg:col-span-2 flex flex-col justify-between`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-2">
              <div>
                <div className="text-sm font-semibold text-slate-200">
                  Compliance Trend by {resolution.charAt(0).toUpperCase() + resolution.slice(1)}s
                </div>
                <p className="text-xs text-slate-500 mt-1">Comparison of compliant (green) vs non-compliant (red) submissions.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Group by:</span>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value as any)}
                  className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-300 outline-none transition focus:border-blue-500 cursor-pointer"
                >
                  <option value="minute">Minute</option>
                  <option value="hour">Hour</option>
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                </select>
              </div>
            </div>

            {trendData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center rounded-2xl border border-dashed border-slate-800 py-12 text-sm text-slate-500">
                No trend data yet.
              </div>
            ) : (
              <div className="flex h-44 items-end justify-around gap-2 px-2 pb-2 mt-4">
                {(() => {
                  const maxTotal = Math.max(...trendData.map((t: any) => t.total), 1);
                  return trendData.map((item: any) => {
                    const nonCompliant = item.total - item.compliant;
                    const compliantPct = (item.compliant / maxTotal) * 100;
                    const nonCompliantPct = (nonCompliant / maxTotal) * 100;
                    const rate = item.total > 0 ? Math.round((item.compliant / item.total) * 100) : 0;

                    return (
                      <div key={item.key} className="group relative flex flex-1 flex-col items-center gap-2 max-w-[64px]">
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 hidden w-36 rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-[10px] text-slate-300 shadow-2xl group-hover:block z-10 font-mono text-center">
                          <div className="text-white font-bold mb-1">{item.label}</div>
                          <div className="border-b border-slate-800 pb-1 mb-1">Total: {item.total}</div>
                          <div className="text-emerald-400">Pass: {item.compliant} ({rate}%)</div>
                          {nonCompliant > 0 && <div className="text-rose-400">Fail: {nonCompliant}</div>}
                        </div>

                        {/* Stacked Bar Chart */}
                        <div className="relative w-full h-28 rounded-lg bg-slate-950 overflow-hidden flex flex-col justify-end border border-slate-800/80">
                          {nonCompliant > 0 && (
                            <div 
                              className="bg-rose-500/85 hover:bg-rose-500 w-full transition-all duration-300" 
                              style={{ height: `${nonCompliantPct}%` }}
                            />
                          )}
                          <div 
                            className="bg-emerald-500/85 hover:bg-emerald-500 w-full transition-all duration-300" 
                            style={{ height: `${compliantPct}%` }}
                          />
                        </div>
                        
                        {/* Label */}
                        <span className="font-mono text-[9px] text-slate-500 truncate w-full text-center">{item.label}</span>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </section>

        {/* SECTION 2: SPECIFICATIONS & REQUIRING ATTENTION (MIDDLE) */}
        <section className="grid gap-6 lg:grid-cols-2">
          {/* Configuration Card */}
          <div className={cardClass}>
            <div className="mb-4 flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <FileJson className="h-4 w-4 text-blue-400" />
                Configuration Specifications
              </div>
              {!isEditingRules ? (
                <button
                  type="button"
                  onClick={() => setIsEditingRules(true)}
                  className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-xs font-semibold text-blue-400 transition hover:border-slate-700 hover:text-blue-300"
                >
                  Edit Rules
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={savingRules}
                    onClick={handleSaveRules}
                    className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-blue-500 disabled:opacity-50"
                  >
                    {savingRules ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditableRules(config.rules || "");
                      setIsEditingRules(false);
                    }}
                    className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs font-bold text-slate-400 transition hover:border-slate-700 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            {isEditingRules ? (
              <textarea
                rows={6}
                value={editableRules}
                onChange={(e) => setEditableRules(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm leading-6 text-slate-200 outline-none focus:border-blue-500 transition font-sans"
              />
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-400">{config.rules}</p>
            )}
            <div className="mt-5 grid gap-4 sm:grid-cols-2 border-t border-slate-800/80 pt-4">
              <div>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Input Schema Fields</div>
                <div className="flex flex-wrap gap-1.5">
                  {inputFields.map((field) => (
                    <span key={field} className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 font-mono text-[10px] text-slate-400">
                      {field}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Output Schema Fields</div>
                <div className="flex flex-wrap gap-1.5">
                  {outputFields.map((field) => (
                    <span key={field} className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 font-mono text-[10px] text-slate-400">
                      {field}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Requires Attention Card */}
          <div className={cardClass}>
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-200">
              <AlertCircle className="h-4 w-4 text-rose-400" />
              Employees Requiring Attention
            </div>
            {dashboard.missingFlags.length === 0 ? (
              <div className="flex h-36 items-center justify-center rounded-2xl border border-dashed border-slate-800 text-sm text-slate-500">
                No flagged compliance issues.
              </div>
            ) : (
              <div className={`${panelClass} overflow-hidden max-h-60 overflow-y-auto`}>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="border-b border-slate-800 bg-slate-900/70 sticky top-0 z-10">
                      <tr>
                        <th className={tableHeadClass}>Employee</th>
                        <th className={tableHeadClass}>Verdict</th>
                        <th className={tableHeadClass}>Issue Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.missingFlags.map((item: any, index: number) => (
                        <tr key={`${item.employeeId}-${index}`} className="border-b border-slate-800/80 last:border-b-0">
                          <td className={`${tableCellClass} font-mono text-xs`}>{item.employeeId}</td>
                          <td className={tableCellClass}>
                            <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-400 uppercase">
                              {item.verdict}
                            </span>
                          </td>
                          <td className={`${tableCellClass} text-slate-300 text-xs`}>{item.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* SECTION 3: SUBMISSION HISTORY (BOTTOM) */}
        <section className={cardClass}>
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="text-sm font-semibold text-slate-200">Submission History</div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{submissions.length} records</div>
          </div>
          {submissions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 px-4 py-8 text-sm text-slate-500">No submissions yet.</div>
          ) : (
            <div className={`${panelClass} overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="border-b border-slate-800 bg-slate-900/70">
                    <tr>
                      <th className={tableHeadClass}>Created</th>
                      <th className={tableHeadClass}>Status</th>
                      <th className={tableHeadClass}>Verdict</th>
                      <th className={tableHeadClass}>Employee/ID</th>
                      <th className={tableHeadClass}>Files</th>
                      <th className={tableHeadClass}>Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((submission: any) => (
                      <tr key={submission._id} className="border-b border-slate-800/80 last:border-b-0">
                        <td className={`${tableCellClass} whitespace-nowrap text-slate-300`}>
                          {new Date(submission.createdAt).toLocaleString()}
                        </td>
                        <td className={tableCellClass}>
                          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase ${
                            submission.status === "DONE" 
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" 
                              : submission.status === "ERROR"
                              ? "border-rose-500/20 bg-rose-500/10 text-rose-400"
                              : "border-slate-700 bg-slate-900 text-slate-300"
                          }`}>
                            {submission.status}
                          </span>
                        </td>
                        <td className={tableCellClass}>
                          {submission.result?.verdict ? (
                            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase ${
                              submission.result.verdict === "pass" || submission.result.verdict === "ready"
                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                                : submission.result.verdict === "partial" || submission.result.verdict === "risk"
                                ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                                : "border-rose-500/20 bg-rose-500/10 text-rose-400"
                            }`}>
                              {submission.result.verdict}
                            </span>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>
                        <td className={`${tableCellClass} font-mono text-xs`}>
                          {String(submission.inputData?.employeeId ?? submission.inputData?.repId ?? submission.inputData?.unitId ?? "-")}
                        </td>
                        <td className={tableCellClass}>{submission.files?.length ?? 0}</td>
                        <td className={tableCellClass}>
                          <button
                            type="button"
                            onClick={() => setSelectedSubmission(submission)}
                            className="text-sm font-medium text-blue-400 transition hover:text-blue-300"
                          >
                            View Detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>


        {selectedSubmission ? (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Evaluation Details</h3>
                <p className="text-xs text-slate-500">Submission ID: {selectedSubmission._id}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-bold text-slate-400 transition hover:border-slate-700 hover:text-white"
              >
                Close Detail
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
              {/* Left Column: Input Data & Media */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-5 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Submitted Metadata</h4>
                  <div className="divide-y divide-slate-800/60">
                    {Object.entries(selectedSubmission.inputData ?? {}).map(([key, val]) => {
                      if (key === "mediaUrls" || key === "evidencePhoto" || key === "audioVideoFile" || key === "trainingCertificate" || key === "signedComplianceForm") return null;
                      return (
                        <div key={key} className="py-2.5 flex justify-between gap-4 text-sm">
                          <span className="text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className="font-semibold text-slate-200 text-right font-mono text-xs">{String(val)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Uploaded Evidence Files Section */}
                <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-5 space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Attached Evidence</h4>
                  {selectedSubmission.files && selectedSubmission.files.length > 0 ? (
                    <div className="grid gap-3">
                      {selectedSubmission.files.map((fileObj: any, index: number) => {
                        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileObj.filename);
                        return (
                          <div key={index} className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                            <div className="flex items-center gap-2.5">
                              <FileJson className="h-4 w-4 text-blue-400 shrink-0" />
                              <a
                                href={fileObj.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-medium text-slate-300 hover:text-blue-400 truncate underline"
                              >
                                {fileObj.filename}
                              </a>
                            </div>
                            {isImage && (
                              <div className="relative mt-1 aspect-video w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
                                <img
                                  src={fileObj.fileUrl}
                                  alt={fileObj.filename}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No files attached to this submission.</p>
                  )}
                </div>
              </div>

              {/* Right Column: Normalized Verdict, Gaps, Recommendations & Logs */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-6 space-y-6">
                  {/* Verdict Header */}
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-400">Verdict</span>
                      {selectedSubmission.result?.verdict === "pass" || selectedSubmission.result?.verdict === "ready" ? (
                        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-400">
                          Pass
                        </span>
                      ) : selectedSubmission.result?.verdict === "fail" || selectedSubmission.result?.verdict === "not_ready" ? (
                        <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-rose-400">
                          Fail
                        </span>
                      ) : (
                        <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-400">
                          {selectedSubmission.result?.verdict ?? "Review"}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <span className="block text-[10px] uppercase tracking-wider text-slate-500">Score</span>
                        <span className="text-lg font-bold text-white">{selectedSubmission.result?.score ?? 0}</span>
                      </div>
                      <div className="text-center">
                        <span className="block text-[10px] uppercase tracking-wider text-slate-500">Confidence</span>
                        <span className="text-lg font-bold text-white">{Math.round((selectedSubmission.result?.confidence ?? 0) * 100)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Indicators */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Score Progress</span>
                        <span>{selectedSubmission.result?.score ?? 0}/100</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            (selectedSubmission.result?.score ?? 0) >= 80 ? "bg-emerald-500" : (selectedSubmission.result?.score ?? 0) >= 60 ? "bg-amber-500" : "bg-rose-500"
                          }`}
                          style={{ width: `${selectedSubmission.result?.score ?? 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Confidence Index</span>
                        <span>{Math.round((selectedSubmission.result?.confidence ?? 0) * 100)}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${(selectedSubmission.result?.confidence ?? 0) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Reason text */}
                  <div className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-400 block">Analysis & Findings</span>
                    <blockquote className="rounded-xl border-l-4 border-blue-500 bg-slate-900/60 p-4 text-sm leading-6 text-slate-200">
                      {selectedSubmission.result?.reason ?? "No analysis available."}
                    </blockquote>
                  </div>

                  {/* Fix Suggestion */}
                  {selectedSubmission.result?.fixSuggestion && (
                    <div className="space-y-2">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-400 block">Coaching / Corrective Actions</span>
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm leading-6 text-slate-300">
                        {selectedSubmission.result.fixSuggestion}
                      </div>
                    </div>
                  )}
                </div>

                {/* Collapsible raw details */}
                <details className="group rounded-2xl border border-slate-800 bg-slate-950/30 overflow-hidden">
                  <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 hover:bg-slate-900/40 select-none">
                    <span>Developer Logs & Raw Adapter JSON</span>
                    <span className="transition group-open:rotate-180">▼</span>
                  </summary>
                  <div className="border-t border-slate-800 p-5 space-y-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Normalized JSON</span>
                      <pre className="whitespace-pre-wrap break-words rounded-xl border border-slate-800 bg-slate-950 p-3 text-[10px] text-slate-400 font-mono">
                        {JSON.stringify(selectedSubmission.result ?? null, null, 2)}
                      </pre>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Raw Adapter JSON</span>
                      <pre className="whitespace-pre-wrap break-words rounded-xl border border-slate-800 bg-slate-950 p-3 text-[10px] text-slate-400 font-mono">
                        {JSON.stringify(selectedSubmission.rawResult ?? null, null, 2)}
                      </pre>
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
