import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  ClipboardCheck,
  FileClock,
  LogOut,
  Send,
  ShieldCheck,
  Upload,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";
import {
  createComplianceSubmission,
  fetchComplianceConfigs,
  fetchComplianceSubmissions,
} from "~/lib/compliance-api.client";
import {
  clearDemoSession,
  getDemoSession,
  isEmployeeDepartment,
  type ComplianceConfigDto,
  type ComplianceSubmissionDto,
  type DemoAccount,
  type EmployeeDepartment,
} from "~/lib/compliance-demo";
import {
  BrandMark,
  Chip,
  ComplianceThemeStyle,
  Eyebrow,
} from "~/lib/compliance-theme";
import logoUrl from "../../logo.png?url";

type SubmissionForm = {
  evidenceText: string;
  file: File | null;
};

export default function EmployeeDashboardPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<(DemoAccount & { department: EmployeeDepartment }) | null>(null);
  const [configs, setConfigs] = useState<ComplianceConfigDto[]>([]);
  const [submissions, setSubmissions] = useState<ComplianceSubmissionDto[]>([]);
  const [forms, setForms] = useState<Record<string, SubmissionForm>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function loadData(activeSession: DemoAccount & { department: EmployeeDepartment }) {
    setLoading(true);
    setError("");
    try {
      const [nextConfigs, allSubmissions] = await Promise.all([
        fetchComplianceConfigs(activeSession.department),
        fetchComplianceSubmissions(),
      ]);
      setConfigs(nextConfigs);
      setSubmissions(allSubmissions.filter((s) => s.employeeEmail === activeSession.email));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load employee dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const activeSession = getDemoSession();
    if (!activeSession || activeSession.role !== "Employee" || !isEmployeeDepartment(activeSession.department)) {
      navigate("/login");
      return;
    }
    const employeeSession = activeSession as DemoAccount & { department: EmployeeDepartment };
    setSession(employeeSession);
    void loadData(employeeSession);
  }, [navigate]);

  async function submitEvidence(event: FormEvent<HTMLFormElement>, config: ComplianceConfigDto) {
    event.preventDefault();
    if (!session) return;
    const form = forms[config._id] ?? { evidenceText: "", file: null };
    setSavingId(config._id);
    setError("");
    try {
      await createComplianceSubmission({
        configId: config.pluginId,
        employeeName: session.name,
        employeeEmail: session.email,
        department: session.department,
        evidenceText: form.evidenceText,
        evidenceFileName: form.file?.name,
        file: form.file,
      });
      setForms((cur) => ({ ...cur, [config._id]: { evidenceText: "", file: null } }));
      await loadData(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit evidence.");
    } finally {
      setSavingId("");
    }
  }

  function updateForm(configId: string, patch: Partial<SubmissionForm>) {
    setForms((cur) => ({
      ...cur,
      [configId]: { ...(cur[configId] ?? { evidenceText: "", file: null }), ...patch },
    }));
  }

  function logout() {
    clearDemoSession();
    navigate("/login");
  }

  const submittedConfigIds = new Set(submissions.map((s) => s.configId));
  const pendingCount = configs.filter((c) => !submittedConfigIds.has(c.pluginId)).length;

  return (
    <div className="cmp min-h-screen" style={{ background: "var(--paper)" }}>
      <ComplianceThemeStyle />

      {/* Header */}
      <header className="sticky top-0 z-10" style={{ background: "var(--ink)", color: "#fff" }}>
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3">
          <BrandMark tone="dark" logoSrc={logoUrl} />
          <div className="hidden h-7 w-px sm:block" style={{ background: "rgba(255,255,255,.12)" }} />
          <div className="hidden sm:block">
            <p className="ey" style={{ color: "var(--herb)" }}>Staff · My Training &amp; SOPs</p>
            <p className="dp" style={{ fontWeight: 700, fontSize: 14 }}>Food-Safety Tasks</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right md:block">
              <p style={{ fontSize: 12.5, color: "#EAD7DD", fontWeight: 500 }}>{session?.name}</p>
              <p className="mono" style={{ fontSize: 9.5, color: "var(--teal)" }}>{session?.department}</p>
            </div>
            <Link to="/" className="dark-btn">Home</Link>
            <button onClick={logout} className="dark-btn flex items-center gap-1.5">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {/* Page title */}
        <div className="mb-5">
          <h1 className="dp" style={{ fontSize: 22, fontWeight: 700 }}>My Training &amp; SOPs</h1>
          <p style={{ color: "var(--soft)", fontSize: 12.5, marginTop: 1 }}>
            Upload certificates, sign SOPs, and submit for AI evaluation
          </p>
        </div>

        {/* Error */}
        {error ? (
          <div
            className="mb-5 flex items-center gap-2.5 rounded-lg px-4 py-3 text-sm"
            style={{ background: "var(--bad-f)", border: "1px solid var(--bad-l)", color: "var(--bad)" }}
          >
            <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
          </div>
        ) : null}

        {/* Scorecards */}
        <div className="mb-6 grid gap-2.5 sm:grid-cols-3">
          <Metric label="Assigned Configs" value={configs.length} accent="neu" icon={<ShieldCheck />} />
          <Metric label="Submitted" value={submissions.length} accent="ok" icon={<ClipboardCheck />} />
          <Metric label="Pending" value={pendingCount} accent={pendingCount ? "warn" : "neu"} icon={<FileClock />} />
        </div>

        {/* Section header */}
        <div className="mb-4">
          <h2 className="dp" style={{ fontSize: 16, fontWeight: 700 }}>
            {session?.department} Station Requirements
          </h2>
          <p style={{ fontSize: 13, color: "var(--soft)" }}>
            SOPs &amp; training assigned to{" "}
            <span style={{ fontWeight: 500, color: "var(--accent)" }}>{session?.department}</span> or All staff
          </p>
        </div>

        {loading ? (
          <div className="card-soft p-6" style={{ fontSize: 13, color: "var(--softer)" }}>
            Loading assigned configs...
          </div>
        ) : configs.length === 0 ? (
          <div
            className="flex flex-col items-center py-14 text-center"
            style={{ border: "2px dashed var(--line)", borderRadius: 10, background: "var(--surf)" }}
          >
            <ShieldCheck className="mb-2 h-7 w-7" style={{ color: "var(--softer)" }} />
            <p style={{ fontSize: 13, color: "var(--soft)" }}>No configs assigned right now</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {configs.map((config) => {
              const form = forms[config._id] ?? { evidenceText: "", file: null };
              const submitted = submittedConfigIds.has(config.pluginId);
              const isExpanded = expandedId === config._id;

              return (
                <article key={config._id} className="card-soft overflow-hidden">
                  {/* Card header */}
                  <div className="p-5" style={{ borderBottom: "1px solid var(--line2)" }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          <TypeBadge type={config.type} />
                          <DeptBadge dept={config.targetDepartment} />
                        </div>
                        <h3 className="dp" style={{ fontSize: 14.5, fontWeight: 700 }}>{config.title}</h3>
                        {config.description ? (
                          <p className="mt-1 line-clamp-2" style={{ fontSize: 12, lineHeight: 1.5, color: "var(--soft)" }}>
                            {config.description}
                          </p>
                        ) : null}
                      </div>
                      {submitted ? <Chip tone="ok">Submitted</Chip> : null}
                    </div>

                    {/* Details toggle */}
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : config._id)}
                      className="mt-3 flex items-center gap-1 transition"
                      style={{ fontSize: 12, fontWeight: 600, color: "var(--teal)" }}
                    >
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {isExpanded ? "Hide details" : "View details"}
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="mt-3 rounded-lg p-3" style={{ border: "1px solid var(--line)", background: "var(--paper)" }}>
                        {config.requirements.length > 0 ? (
                          <div>
                            <Eyebrow className="mb-2">Requirements</Eyebrow>
                            <ul className="space-y-1.5">
                              {config.requirements.map((req) => (
                                <li key={req} className="flex items-start gap-2" style={{ fontSize: 12, color: "var(--soft)" }}>
                                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--teal)" }} />
                                  {req}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <p style={{ fontSize: 12, color: "var(--softer)" }}>No requirements listed.</p>
                        )}
                        {config.createdAt ? (
                          <p className="mono mt-2" style={{ fontSize: 10, color: "var(--softer)" }}>
                            Created: {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(config.createdAt))}
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Submission form */}
                  <div className="p-5">
                    <form onSubmit={(e) => submitEvidence(e, config)} className="space-y-3">
                      <textarea
                        required
                        value={form.evidenceText}
                        onChange={(e) => updateForm(config._id, { evidenceText: e.target.value })}
                        placeholder="Describe completed training, attach your certificate, and acknowledge the SOP..."
                        className="form-input min-h-[80px] resize-none"
                      />

                      <div className="grid gap-3">
                        {/* File upload */}
                        {form.file ? (
                          <div
                            className="flex items-center justify-between rounded-lg px-3 py-2"
                            style={{ border: "1px solid var(--line)", background: "var(--paper)" }}
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <FileText className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--teal)" }} />
                              <span className="truncate" style={{ fontSize: 12, fontWeight: 500 }}>{form.file.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => updateForm(config._id, { file: null })}
                              className="ml-2 shrink-0 rounded p-0.5 transition"
                              style={{ color: "var(--softer)" }}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <label
                            className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 transition"
                            style={{ border: "2px dashed var(--line)", background: "var(--paper)" }}
                          >
                            <Upload className="h-4 w-4 shrink-0" style={{ color: "var(--softer)" }} />
                            <span style={{ fontSize: 12, color: "var(--soft)" }}>
                              Attach file <span style={{ color: "var(--teal)" }}>(optional)</span>
                            </span>
                            <input
                              type="file"
                              className="sr-only"
                              onChange={(e) => updateForm(config._id, { file: e.target.files?.[0] ?? null })}
                            />
                          </label>
                        )}
                      </div>

                      <button disabled={savingId === config._id} className="primary-btn w-full justify-center">
                        <Send className="h-4 w-4" />
                        {savingId === config._id ? "Submitting..." : "Submit Evidence"}
                      </button>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .cmp .card-soft{
          background:var(--surf);border:1px solid var(--line);border-radius:10px;box-shadow:var(--sh);
        }
        .cmp .dark-btn{
          border-radius:7px;padding:6px 11px;font-size:12px;font-weight:500;
          color:#B79AA3;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);
          transition:.12s;white-space:nowrap;display:inline-flex;align-items:center;
        }
        .cmp .dark-btn:hover{background:rgba(255,255,255,.12);color:#EAD7DD}
        .cmp .primary-btn{
          display:inline-flex;align-items:center;gap:6px;border:1px solid var(--ink);
          background:var(--ink);color:#fff;border-radius:8px;padding:9px 14px;
          font-weight:600;font-size:13px;transition:.12s;
        }
        .cmp .primary-btn:hover{background:var(--ink2)}
        .cmp .primary-btn:disabled{opacity:.5;cursor:not-allowed}
      `}</style>
    </div>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={className}
      style={{ background: "var(--surf)", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "var(--sh)" }}
    >
      {children}
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: number | string;
  accent: "ok" | "bad" | "warn" | "neu";
  icon: ReactNode;
}) {
  const bar: Record<string, string> = {
    ok: "var(--ok)",
    bad: "var(--bad)",
    warn: "var(--warn)",
    neu: "var(--softer)",
  };
  return (
    <Card className="p-4">
      <div className="mb-1.5 flex items-center justify-between">
        <span style={{ fontSize: 11.5, color: "var(--soft)", fontWeight: 500 }}>{label}</span>
        <span className="grid place-items-center" style={{ color: "var(--softer)", width: 15, height: 15 }}>{icon}</span>
      </div>
      <div className="dp" style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
      <div className="mt-2.5 h-[3px] overflow-hidden rounded-full" style={{ background: "var(--line2)" }}>
        <span className="block h-full rounded-full" style={{ width: "100%", background: bar[accent] }} />
      </div>
    </Card>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className="mono rounded font-medium uppercase"
      style={{ fontSize: 9.5, padding: "1px 6px", border: "1px solid var(--accent-f)", background: "var(--accent-f)", color: "var(--accent)" }}
    >
      {type}
    </span>
  );
}

function DeptBadge({ dept }: { dept: string }) {
  return (
    <span
      className="mono inline-flex items-center rounded"
      style={{ fontSize: 11, fontWeight: 500, padding: "1px 7px", border: "1px solid var(--line)", background: "var(--paper)", color: "var(--ink2)" }}
    >
      {dept}
    </span>
  );
}
