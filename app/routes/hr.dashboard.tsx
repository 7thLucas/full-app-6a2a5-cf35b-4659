import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  AlertTriangle,
  BarChart3,
  FileCheck2,
  LogOut,
  Plus,
  ShieldCheck,
  UsersRound,
  ChevronDown,
  Building2,
  Upload,
  X,
  FileText,
  ChevronRight,
  ExternalLink,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import {
  createComplianceConfig,
  fetchComplianceConfigs,
  fetchComplianceSubmissions,
} from "~/lib/compliance-api.client";
import {
  clearDemoSession,
  departments,
  getDemoSession,
  type ComplianceConfigDto,
  type ComplianceConfigType,
  type ComplianceSubmissionDto,
  type Department,
  type DemoAccount,
} from "~/lib/compliance-demo";
import {
  AiTag,
  BrandMark,
  Chip,
  ComplianceThemeStyle,
  Eyebrow,
} from "~/lib/compliance-theme";
import logoUrl from "../../logo.png?url";

const targetDepartments = departments.filter((d) => d !== "All") as Exclude<Department, "All">[];

const defaultForm = {
  title: "",
  description: "",
  type: "SOP" as ComplianceConfigType,
  requirements: "",
};

type Tab = "upload" | "configs";

export default function HrDashboardPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<DemoAccount | null>(null);
  const [configs, setConfigs] = useState<ComplianceConfigDto[]>([]);
  const [submissions, setSubmissions] = useState<ComplianceSubmissionDto[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [selectedDept, setSelectedDept] = useState<Exclude<Department, "All"> | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("upload");
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [detailSubmission, setDetailSubmission] = useState<ComplianceSubmissionDto | null>(null);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [nextConfigs, nextSubmissions] = await Promise.all([
        fetchComplianceConfigs(),
        fetchComplianceSubmissions(),
      ]);
      setConfigs(nextConfigs);
      setSubmissions(nextSubmissions);
      if (nextConfigs.length > 0 && !selectedConfigId) {
        setSelectedConfigId(nextConfigs[0]._id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const activeSession = getDemoSession();
    if (!activeSession || activeSession.role !== "HR") {
      navigate("/login");
      return;
    }
    setSession(activeSession);
    void loadData();
  }, [navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDept) return;
    setSaving(true);
    setError("");
    try {
      await createComplianceConfig({
        ...form,
        targetDepartment: selectedDept,
        file: selectedFile,
      });
      setForm(defaultForm);
      setSelectedFile(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create compliance config.");
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    clearDemoSession();
    navigate("/login");
  }

  const needsReviewCount = submissions.filter((s) => s.status === "Needs Review").length;
  const compliantCount = submissions.filter((s) => s.status === "Submitted" || s.status === "Approved").length;

  const selectedConfig = configs.find((c) => c._id === selectedConfigId) ?? null;
  const configSubmissions = submissions.filter((s) => s.configId === selectedConfig?.pluginId);

  return (
    <div className="cmp min-h-screen" style={{ background: "var(--paper)" }}>
      <ComplianceThemeStyle />

      {/* Header */}
      <header
        className="sticky top-0 z-10"
        style={{ background: "var(--ink)", color: "#fff" }}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3">
          <BrandMark tone="dark" logoSrc={logoUrl} />
          <div className="hidden h-7 w-px sm:block" style={{ background: "rgba(255,255,255,.12)" }} />
          <div className="hidden sm:block">
            <p className="ey" style={{ color: "var(--herb)" }}>Manager / Owner · Susie Q</p>
            <p className="dp" style={{ fontWeight: 700, fontSize: 14 }}>
              Kitchen Compliance
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right md:block">
              <p style={{ fontSize: 12.5, color: "#EAD7DD", fontWeight: 500 }}>{session?.name}</p>
              <p className="mono" style={{ fontSize: 9.5, color: "#9C7E88" }}>Manager / Owner</p>
            </div>
            <Link to="/" className="dark-btn">
              Home
            </Link>
            <button onClick={logout} className="dark-btn flex items-center gap-1.5">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {/* Page title */}
        <div className="mb-5">
          <h1 className="dp" style={{ fontSize: 22, fontWeight: 700 }}>Dashboard</h1>
          <p style={{ color: "var(--soft)", fontSize: 12.5, marginTop: 1 }}>
            Food-safety SOPs, staff submissions and pending AI reviews
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
        <div className="mb-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Total Configs" value={configs.length} accent="neu" icon={<FileCheck2 />} />
          <Metric label="Total Submissions" value={submissions.length} accent="ok" icon={<UsersRound />} />
          <Metric label="Compliant" value={compliantCount} accent={compliantCount ? "ok" : "neu"} icon={<BarChart3 />} />
          <Metric label="Needs Review" value={needsReviewCount} accent={needsReviewCount ? "bad" : "neu"} icon={<AlertTriangle />} />
        </div>

        {/* Tabs */}
        <div className="mb-6 flex w-fit gap-px rounded-lg p-[3px]" style={{ border: "1px solid var(--line)", background: "var(--line2)" }}>
          <TabBtn active={tab === "upload"} onClick={() => setTab("upload")}>
            <Plus className="h-3.5 w-3.5" /> Upload SOP
          </TabBtn>
          <TabBtn active={tab === "configs"} onClick={() => setTab("configs")}>
            <FileText className="h-3.5 w-3.5" /> Configs &amp; Submissions
          </TabBtn>
        </div>

        {/* Tab 1: Upload */}
        {tab === "upload" && (
          <div className="max-w-2xl">
            <Card className="p-6">
              <h2 className="dp" style={{ fontSize: 16, fontWeight: 700 }}>
                Upload SOP / Food-Safety Rule
              </h2>
              <p className="mb-6 mt-1" style={{ color: "var(--soft)", fontSize: 13 }}>
                Attach an SOP or rule document for AI parsing, or fill in the form manually.
              </p>

              {/* Step 1 */}
              <div className="mb-5">
                <Eyebrow className="mb-2 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" /> Step 1 — Target Station
                </Eyebrow>
                <div className="flex flex-wrap gap-2">
                  {targetDepartments.map((dept) => {
                    const active = selectedDept === dept;
                    return (
                      <button
                        key={dept}
                        type="button"
                        onClick={() => setSelectedDept(dept)}
                        className="rounded-lg px-5 py-2 text-sm font-medium transition"
                        style={
                          active
                            ? { background: "var(--ink)", border: "1px solid var(--ink)", color: "#fff" }
                            : { background: "var(--surf)", border: "1px solid var(--line)", color: "var(--ink2)" }
                        }
                      >
                        {dept}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2 */}
              {selectedDept ? (
                <form onSubmit={handleSubmit}>
                  <Eyebrow className="mb-4 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" /> Step 2 — Config Details for{" "}
                    <span style={{ color: "var(--teal)" }}>{selectedDept}</span>
                  </Eyebrow>

                  <FormField label="Title">
                    <input
                      required={!selectedFile}
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder={`e.g. ${selectedDept} Allergen Handling SOP`}
                      className="form-input"
                    />
                  </FormField>

                  <FormField label="Description">
                    <textarea
                      required={!selectedFile}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Describe the food-safety requirement..."
                      className="form-input min-h-[80px] resize-none"
                    />
                  </FormField>

                  <FormField label="Type">
                    <div className="relative">
                      <select
                        value={form.type}
                        onChange={(e) => setForm({ ...form, type: e.target.value as ComplianceConfigType })}
                        className="form-input appearance-none pr-9"
                      >
                        <option value="SOP">SOP</option>
                        <option value="CONFIG">CONFIG</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--softer)" }} />
                    </div>
                  </FormField>

                  <FormField label="Requirements (one per line)">
                    <textarea
                      value={form.requirements}
                      onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                      placeholder={"Requirement 1\nRequirement 2\n..."}
                      className="form-input min-h-[80px] resize-none"
                    />
                  </FormField>

                  <FormField label="SOP / Config File (optional)">
                    {selectedFile ? (
                      <div
                        className="flex items-center justify-between rounded-lg px-4 py-3"
                        style={{ border: "1px solid var(--line)", background: "var(--paper)" }}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <FileText className="h-4 w-4 shrink-0" style={{ color: "var(--teal)" }} />
                          <span className="truncate text-sm font-medium">{selectedFile.name}</span>
                          <span className="mono shrink-0" style={{ fontSize: 11, color: "var(--softer)" }}>
                            ({(selectedFile.size / 1024).toFixed(0)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedFile(null)}
                          className="ml-2 shrink-0 rounded p-1 transition"
                          style={{ color: "var(--softer)" }}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label
                        className="flex cursor-pointer flex-col items-center gap-2 rounded-lg px-4 py-6 text-center transition"
                        style={{ border: "2px dashed var(--line)", background: "var(--paper)" }}
                      >
                        <Upload className="h-5 w-5" style={{ color: "var(--softer)" }} />
                        <span style={{ fontSize: 13, color: "var(--soft)" }}>
                          Drop file or <span style={{ fontWeight: 600, color: "var(--teal)" }}>browse</span>
                        </span>
                        <span className="mono" style={{ fontSize: 10, color: "var(--softer)" }}>PDF, DOC, DOCX, MD, TXT</span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.md,.txt"
                          className="sr-only"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        />
                      </label>
                    )}
                  </FormField>

                  <button disabled={saving} className="primary-btn mt-1 w-full justify-center">
                    {saving ? (
                      "Saving..."
                    ) : selectedFile ? (
                      <><Upload className="h-4 w-4" /> Parse &amp; Create Config</>
                    ) : (
                      <><Plus className="h-4 w-4" /> Create Config</>
                    )}
                  </button>
                </form>
              ) : (
                <div
                  className="flex flex-col items-center justify-center rounded-lg py-12 text-center"
                  style={{ border: "2px dashed var(--line)" }}
                >
                  <Building2 className="mb-2 h-7 w-7" style={{ color: "var(--softer)" }} />
                  <p style={{ fontSize: 13, color: "var(--soft)", fontWeight: 500 }}>
                    Select a department above to continue
                  </p>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Tab 2: Configs & Submissions */}
        {tab === "configs" && (
          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            {/* Config list */}
            <Card className="overflow-hidden">
              <SectionHead icon={<FileText />}>
                <div>
                  <h2 className="dp" style={{ fontSize: 14, fontWeight: 600 }}>All Configs</h2>
                  <p className="mono" style={{ fontSize: 10, color: "var(--softer)" }}>
                    {configs.length} compliance configs
                  </p>
                </div>
              </SectionHead>
              {loading ? (
                <div className="px-4 py-6" style={{ fontSize: 13, color: "var(--softer)" }}>Loading...</div>
              ) : configs.length === 0 ? (
                <div className="flex flex-col items-center px-4 py-10 text-center">
                  <FileText className="mb-2 h-6 w-6" style={{ color: "var(--softer)" }} />
                  <p style={{ fontSize: 13, color: "var(--soft)" }}>No configs yet</p>
                </div>
              ) : (
                <ul>
                  {configs.map((config) => {
                    const count = submissions.filter((s) => s.configId === config.pluginId).length;
                    const isActive = selectedConfigId === config._id;
                    return (
                      <li key={config._id} style={{ borderTop: "1px solid var(--line2)" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedConfigId(config._id)}
                          className="flex w-full items-center justify-between px-4 py-3 text-left transition"
                          style={isActive ? { background: "var(--paper)" } : undefined}
                        >
                          <div className="min-w-0">
                            <p className="truncate" style={{ fontSize: 13, fontWeight: 600, color: isActive ? "var(--ink)" : "var(--ink2)" }}>
                              {config.title}
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              <TypeBadge type={config.type} />
                              <DeptBadge dept={config.targetDepartment} />
                              <span className="mono" style={{ fontSize: 10, color: "var(--softer)" }}>
                                {count} sub{count !== 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="ml-2 h-4 w-4 shrink-0" style={{ color: isActive ? "var(--soft)" : "var(--softer)" }} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            {/* Config detail + submissions */}
            <div className="min-w-0">
              {selectedConfig ? (
                <>
                  {/* Config info card */}
                  <Card className="mb-4 p-5">
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <TypeBadge type={selectedConfig.type} />
                          <DeptBadge dept={selectedConfig.targetDepartment} />
                        </div>
                        <h2 className="dp" style={{ fontSize: 18, fontWeight: 700 }}>{selectedConfig.title}</h2>
                        {selectedConfig.description ? (
                          <p className="mt-1" style={{ fontSize: 13, color: "var(--soft)" }}>{selectedConfig.description}</p>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="dp" style={{ fontSize: 26, fontWeight: 700 }}>{configSubmissions.length}</p>
                        <p className="mono" style={{ fontSize: 10, color: "var(--softer)" }}>submissions</p>
                      </div>
                    </div>
                    {selectedConfig.requirements.length > 0 ? (
                      <div className="rounded-lg p-3" style={{ border: "1px solid var(--line)", background: "var(--paper)" }}>
                        <Eyebrow className="mb-2">Requirements</Eyebrow>
                        <ul className="space-y-1">
                          {selectedConfig.requirements.map((req) => (
                            <li key={req} className="flex items-start gap-2" style={{ fontSize: 13, color: "var(--soft)" }}>
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--teal)" }} />
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </Card>

                  {/* Submissions table */}
                  <Card className="overflow-hidden">
                    <SectionHead icon={<UsersRound />}>
                      <h3 className="dp" style={{ fontSize: 14, fontWeight: 600 }}>Submissions for this config</h3>
                    </SectionHead>
                    {configSubmissions.length === 0 ? (
                      <div className="flex flex-col items-center py-12 text-center">
                        <FileCheck2 className="mb-2 h-6 w-6" style={{ color: "var(--softer)" }} />
                        <p style={{ fontSize: 13, color: "var(--soft)" }}>No submissions for this config yet</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left" style={{ borderCollapse: "collapse", fontSize: 12.5 }}>
                          <thead>
                            <tr>
                              {["Employee", "Department", "Verdict", "Status", "Date", ""].map((h) => (
                                <th key={h} className="th-cell">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {configSubmissions.map((sub) => (
                              <tr
                                key={sub._id}
                                className="row-hover"
                                style={{ borderTop: "1px solid var(--line2)" }}
                              >
                                <td className="td-cell">
                                  <p style={{ fontSize: 13, fontWeight: 600 }}>{sub.employeeName}</p>
                                  <p className="mono" style={{ fontSize: 10, color: "var(--softer)" }}>{sub.employeeEmail}</p>
                                </td>
                                <td className="td-cell"><DeptBadge dept={sub.department} /></td>
                                <td className="td-cell"><VerdictBadge submission={sub} /></td>
                                <td className="td-cell"><StatusBadge status={sub.status} /></td>
                                <td className="td-cell mono" style={{ fontSize: 10, color: "var(--softer)" }}>
                                  {formatDate(sub.submittedAt || sub.createdAt)}
                                </td>
                                <td className="td-cell">
                                  <button
                                    type="button"
                                    onClick={() => setDetailSubmission(sub)}
                                    className="ghost-btn flex items-center gap-1"
                                  >
                                    <ExternalLink className="h-3 w-3" /> Details
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card>
                </>
              ) : (
                <Card className="flex h-64 flex-col items-center justify-center text-center">
                  <FileText className="mb-2 h-7 w-7" style={{ color: "var(--softer)" }} />
                  <p style={{ fontSize: 13, color: "var(--soft)" }}>Select a config from the list</p>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Submission detail drawer */}
      {detailSubmission ? (
        <SubmissionDrawer submission={detailSubmission} onClose={() => setDetailSubmission(null)} />
      ) : null}

      <style>{`
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
        .cmp .ghost-btn{
          border:1px solid var(--line);background:var(--surf);color:var(--soft);
          border-radius:7px;padding:5px 9px;font-size:11.5px;font-weight:600;transition:.12s;white-space:nowrap;
        }
        .cmp .ghost-btn:hover{border-color:#DCC4CC;background:var(--paper);color:var(--ink)}
        .cmp .th-cell{
          text-align:left;font-family:var(--mono);font-size:9.5px;letter-spacing:.08em;
          text-transform:uppercase;color:var(--softer);font-weight:500;padding:10px 14px;
          border-bottom:1px solid var(--line);background:var(--paper);white-space:nowrap;
        }
        .cmp .td-cell{padding:11px 14px;vertical-align:middle}
        .cmp .row-hover:hover{background:var(--paper)}
      `}</style>
    </div>
  );
}

function SubmissionDrawer({
  submission,
  onClose,
}: {
  submission: ComplianceSubmissionDto;
  onClose: () => void;
}) {
  const result = submission.result as Record<string, unknown> | undefined;
  const verdict = result?.verdict as string | undefined;

  const verdictTone: Record<string, "ok" | "warn" | "bad"> = {
    pass: "ok",
    ready: "ok",
    partial: "warn",
    fail: "bad",
    not_ready: "bad",
    risk: "warn",
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,.28)" }} onClick={onClose} />
      {/* Drawer */}
      <div
        className="cmp fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col"
        style={{ background: "var(--paper)", boxShadow: "var(--shl)" }}
      >
        {/* Drawer header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ background: "var(--surf)", borderBottom: "1px solid var(--line)" }}
        >
          <div>
            <Eyebrow>Submission Detail</Eyebrow>
            <h3 className="dp" style={{ fontSize: 16, fontWeight: 700 }}>{submission.employeeName}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-md transition"
            style={{ border: "1px solid var(--line)", background: "var(--surf)", color: "var(--soft)" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drawer body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* Employee info */}
          <Section title="Employee">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: "var(--ink)", color: "#fff" }}>
                <User className="h-4 w-4" />
              </span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600 }}>{submission.employeeName}</p>
                <p className="mono" style={{ fontSize: 10, color: "var(--softer)" }}>{submission.employeeEmail}</p>
                <p className="mt-0.5" style={{ fontSize: 12, color: "var(--soft)" }}>
                  Department: <span style={{ fontWeight: 500, color: "var(--ink2)" }}>{submission.department}</span>
                </p>
              </div>
            </div>
          </Section>

          {/* Config */}
          <Section title="Config">
            <p style={{ fontSize: 13, fontWeight: 500 }}>{submission.configTitle}</p>
          </Section>

          {/* Status */}
          <Section title="Result">
            <div className="flex items-center gap-3">
              <StatusBadge status={submission.status} />
            </div>
            {submission.submittedAt || submission.createdAt ? (
              <p className="mono mt-1.5" style={{ fontSize: 10, color: "var(--softer)" }}>
                Submitted {formatDate(submission.submittedAt || submission.createdAt)}
              </p>
            ) : null}
          </Section>

          {/* Evidence */}
          {submission.evidenceText ? (
            <Section title="Evidence Text">
              <p
                className="whitespace-pre-wrap rounded-lg p-3 leading-relaxed"
                style={{ border: "1px solid var(--line)", background: "var(--surf)", fontSize: 13, color: "var(--ink2)" }}
              >
                {submission.evidenceText}
              </p>
            </Section>
          ) : null}

          {/* File */}
          {submission.evidenceFileName ? (
            <Section title="Attached File">
              <div className="flex items-center gap-2 rounded-lg px-3 py-2.5" style={{ border: "1px solid var(--line)", background: "var(--surf)" }}>
                <FileText className="h-4 w-4 shrink-0" style={{ color: "var(--teal)" }} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{submission.evidenceFileName}</span>
              </div>
            </Section>
          ) : null}

          {/* Judgment result */}
          {result && verdict ? (
            <Section title="AI Judgment Result">
              <div
                className="space-y-3 rounded-lg p-3.5"
                style={{ border: "1px solid var(--line)", background: "var(--surf)" }}
              >
                {/* Provenance */}
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded" style={{ background: "var(--ink)" }}>
                    <Sparkles className="h-3 w-3" style={{ color: "#fff" }} />
                  </span>
                  <span className="dp" style={{ fontSize: 13, fontWeight: 600 }}>AI judgement</span>
                  <AiTag>Automated</AiTag>
                </div>

                {/* Verdict */}
                <div className="flex items-center gap-3">
                  {verdict === "pass" || verdict === "ready" ? (
                    <CheckCircle2 className="h-5 w-5" style={{ color: "var(--ok)" }} />
                  ) : verdict === "fail" || verdict === "not_ready" ? (
                    <XCircle className="h-5 w-5" style={{ color: "var(--bad)" }} />
                  ) : (
                    <AlertCircle className="h-5 w-5" style={{ color: "var(--warn)" }} />
                  )}
                  <Chip tone={verdictTone[verdict] ?? "neu"}>{verdict.toUpperCase()}</Chip>
                  {typeof result.score === "number" ? (
                    <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: (result.score as number) >= 80 ? "var(--ok)" : "var(--warn)" }}>
                      Score: {result.score as number}%
                    </span>
                  ) : null}
                </div>

                {/* Meta row */}
                <div className="flex flex-wrap gap-2">
                  {typeof result.confidence === "number" ? (
                    <MetaChip label="Confidence" value={`${Math.round((result.confidence as number) * 100)}%`} />
                  ) : null}
                  {result.severity ? <MetaChip label="Severity" value={String(result.severity)} /> : null}
                  {result.requiresHumanReview !== undefined ? (
                    <MetaChip
                      label="Human Review"
                      value={result.requiresHumanReview ? "Required" : "Not Required"}
                      highlight={!!result.requiresHumanReview}
                    />
                  ) : null}
                </div>

                {/* Reason */}
                {result.reason ? (
                  <div>
                    <Eyebrow className="mb-1">Reason</Eyebrow>
                    <p style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.55 }}>{String(result.reason)}</p>
                  </div>
                ) : null}

                {/* Fix suggestion */}
                {result.fixSuggestion ? (
                  <div>
                    <Eyebrow className="mb-1">Fix Suggestion</Eyebrow>
                    <p
                      className="rounded-lg p-3 leading-relaxed"
                      style={{ border: "1px solid var(--warn-l)", background: "var(--warn-f)", fontSize: 13, color: "var(--warn)" }}
                    >
                      {String(result.fixSuggestion)}
                    </p>
                  </div>
                ) : null}
              </div>
            </Section>
          ) : submission.judgmentStatus === "PENDING" ? (
            <Section title="AI Judgment">
              <div className="flex items-center gap-2" style={{ fontSize: 13, color: "var(--soft)" }}>
                <Clock className="h-4 w-4" /> Judgment pending...
              </div>
            </Section>
          ) : null}
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <Eyebrow className="mb-2">{title}</Eyebrow>
      {children}
    </div>
  );
}

function MetaChip({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <span
      className="mono rounded font-medium"
      style={{
        fontSize: 10.5,
        padding: "2px 7px",
        border: `1px solid ${highlight ? "var(--warn-l)" : "var(--line)"}`,
        background: highlight ? "var(--warn-f)" : "var(--line2)",
        color: highlight ? "var(--warn)" : "var(--soft)",
      }}
    >
      {label}: <span style={{ fontWeight: 600 }}>{value}</span>
    </span>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md px-4 py-2 transition"
      style={
        active
          ? { background: "var(--surf)", color: "var(--ink)", fontWeight: 600, fontSize: 12.5, boxShadow: "0 1px 3px rgba(0,0,0,.07)" }
          : { background: "transparent", color: "var(--soft)", fontWeight: 500, fontSize: 12.5 }
      }
    >
      {children}
    </button>
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

function SectionHead({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--line2)", background: "var(--paper)" }}>
      <span className="grid place-items-center" style={{ color: "var(--soft)", width: 16, height: 16 }}>{icon}</span>
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

function StatusBadge({ status }: { status: string }) {
  const tone: Record<string, "ok" | "bad" | "warn" | "neu"> = {
    Submitted: "ok",
    Approved: "ok",
    "Needs Review": "warn",
    Pending: "neu",
  };
  return <Chip tone={tone[status] ?? "neu"}>{status}</Chip>;
}

function VerdictBadge({ submission }: { submission: ComplianceSubmissionDto }) {
  const result = submission.result as Record<string, unknown> | undefined;
  const verdict = typeof result?.verdict === "string" ? result.verdict : "";
  if (!verdict) {
    return submission.judgmentStatus === "PENDING" ? (
      <Chip tone="neu" dot={false}>Pending</Chip>
    ) : (
      <span style={{ color: "var(--softer)" }}>—</span>
    );
  }
  const tone: Record<string, "ok" | "bad" | "warn"> = {
    pass: "ok",
    ready: "ok",
    partial: "warn",
    risk: "warn",
    fail: "bad",
    not_ready: "bad",
  };
  return <Chip tone={tone[verdict] ?? "neu"}>{verdict.toUpperCase()}</Chip>;
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block" style={{ fontSize: 12, fontWeight: 600, color: "var(--ink2)" }}>{label}</span>
      {children}
    </label>
  );
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}
