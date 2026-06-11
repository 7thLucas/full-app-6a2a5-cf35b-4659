import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  ChevronRight, Save, Code2, SlidersHorizontal, Plus, Trash2,
  HelpCircle, Upload, FileText, AlertCircle, CheckSquare, Square,
  CheckCircle2, XCircle, Layers
} from "lucide-react";
import { summarizeOutputFields } from "~/lib/judgment-ui.utils";

interface VisualProperty {
  key: string;
  title: string;
  description: string;
  type: "string" | "number" | "boolean" | "file" | "file_array";
  isRequired: boolean;
}

interface VisualCriterion {
  id: string;
  category: string;
  name: string;
  passCriteria: string;
  severity: "low" | "medium" | "high" | "critical";
  weight: number;
  autoFailIfMissing: boolean;
}

interface ParsedConfig {
  pluginId: string;
  name: string;
  rules: string;
  inputSchema: any;
  outputSchema: any;
  criteria: VisualCriterion[];
  variables: {
    labels: { unitLabel: string; workerLabel: string; managerLabel: string };
    actions: { defaultTaskDueHours: number };
    dashboard: { title: string; company: string };
  };
}

type CardStatus = "idle" | "saving" | "saved" | "error";

const cardClass = "rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 relative group shadow-lg";
const labelClass = "text-xs font-bold uppercase tracking-wider text-slate-400 block";
const inputClass = "h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 text-sm text-white outline-none transition focus:border-blue-500 focus:bg-slate-950";
const textareaClass = "w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-blue-500 focus:bg-slate-950";

const DEFAULT_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    id: { type: "string" },
    evidenceSubmissionId: { type: "string" },
    criterionId: { type: "string" },
    verdict: { type: "string", enum: ["pass", "partial", "fail", "risk", "ready", "not_ready"] },
    score: { type: "number", minimum: 0, maximum: 100 },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
    reason: { type: "string" },
    fixSuggestion: { type: "string" },
    requiresHumanReview: { type: "boolean" },
    provider: { type: "string" },
    model: { type: "string" },
    resultData: {
      type: "object",
      properties: {
        complianceStatus: { type: "string", enum: ["Compliant", "Non-Compliant"] },
        missingItems: { type: "array", items: { type: "string" } },
        auditTrail: { type: "array", items: { type: "object" } }
      }
    }
  },
  required: ["id", "evidenceSubmissionId", "criterionId", "verdict", "score", "confidence", "severity", "reason", "fixSuggestion", "requiresHumanReview"]
};

function serializeConfig(
  pluginId: string,
  name: string,
  rules: string,
  inputProperties: VisualProperty[],
  visualCriteria: VisualCriterion[],
  unitLabel: string,
  workerLabel: string,
  managerLabel: string,
  defaultTaskDueHours: number,
  dashboardTitle: string,
  companyName: string,
  outputSchema: string
) {
  const propertiesObj: Record<string, any> = {};
  const requiredFields: string[] = [];

  inputProperties.forEach((prop) => {
    if (!prop.key.trim()) return;
    const key = prop.key.trim();
    const schemaProp: any = { title: prop.title, description: prop.description };
    if (prop.type === "file") {
      schemaProp.type = "string";
      schemaProp["x-ui"] = { widget: "file" };
    } else if (prop.type === "file_array") {
      schemaProp.type = "array";
      schemaProp.items = { type: "string" };
      schemaProp["x-ui"] = { widget: "file" };
    } else if (prop.type === "number") {
      schemaProp.type = "number";
    } else if (prop.type === "boolean") {
      schemaProp.type = "boolean";
    } else {
      schemaProp.type = "string";
    }
    propertiesObj[key] = schemaProp;
    if (prop.isRequired) requiredFields.push(key);
  });

  return {
    pluginId: pluginId.trim(),
    name: name.trim(),
    rules: rules.trim(),
    inputSchema: { type: "object", properties: propertiesObj, required: requiredFields },
    outputSchema: JSON.parse(outputSchema),
    criteria: visualCriteria.map((c) => ({ ...c, weight: Number(c.weight) })),
    variables: {
      labels: { unitLabel: unitLabel.trim(), workerLabel: workerLabel.trim(), managerLabel: managerLabel.trim() },
      actions: { defaultTaskDueHours: Number(defaultTaskDueHours) },
      dashboard: { title: dashboardTitle.trim(), company: companyName.trim() },
    },
  };
}

function propsToVisual(inputSchema: any): VisualProperty[] {
  if (!inputSchema?.properties) return [];
  const required = inputSchema.required || [];
  return Object.entries(inputSchema.properties).map(([key, val]: [string, any]) => {
    let type: VisualProperty["type"] = "string";
    if (val.type === "array" && val["x-ui"]?.widget === "file") type = "file_array";
    else if (val["x-ui"]?.widget === "file") type = "file";
    else if (val.type === "number" || val.type === "integer") type = "number";
    else if (val.type === "boolean") type = "boolean";
    return { key, title: val.title || key, description: val.description || "", type, isRequired: required.includes(key) };
  });
}

// ─────────────────────────────────────────────────────────────────
// Preview card for generated configs (Step 2)
// ─────────────────────────────────────────────────────────────────
function GeneratedConfigCard({
  cfg,
  index,
  checked,
  onToggle,
  status,
  errorMsg,
  createdId,
  onNameChange,
  onPluginIdChange,
}: {
  cfg: ParsedConfig;
  index: number;
  checked: boolean;
  onToggle: () => void;
  status: CardStatus;
  errorMsg: string | null;
  createdId: string | null;
  onNameChange: (v: string) => void;
  onPluginIdChange: (v: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const fieldCount = Object.keys(cfg.inputSchema?.properties ?? {}).length;
  const criteriaCount = cfg.criteria?.length ?? 0;

  const borderColor =
    status === "saved" ? "border-emerald-500/40" :
    status === "error" ? "border-rose-500/40" :
    checked ? "border-blue-500/30" : "border-slate-800";

  return (
    <div className={`rounded-3xl border ${borderColor} bg-slate-900/60 p-6 transition-all shadow-lg`}>
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        <button
          type="button"
          onClick={onToggle}
          disabled={status === "saved"}
          className="mt-1 shrink-0 text-slate-400 hover:text-blue-400 transition disabled:opacity-40"
        >
          {checked
            ? <CheckSquare className="h-5 w-5 text-blue-400" />
            : <Square className="h-5 w-5" />}
        </button>

        <div className="flex-1 min-w-0 space-y-3">
          {/* Name + pluginId editable */}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Config Name</span>
              <input
                value={cfg.name}
                onChange={(e) => onNameChange(e.target.value)}
                disabled={status === "saved"}
                className="h-9 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-white outline-none focus:border-blue-500 disabled:opacity-50"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Plugin ID</span>
              <input
                value={cfg.pluginId}
                onChange={(e) => onPluginIdChange(e.target.value)}
                disabled={status === "saved"}
                className="h-9 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs font-mono text-white outline-none focus:border-blue-500 disabled:opacity-50"
              />
            </label>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-800 bg-slate-950 px-2.5 py-0.5 text-[10px] font-semibold text-slate-400">
              {fieldCount} field{fieldCount !== 1 ? "s" : ""}
            </span>
            <span className="rounded-full border border-slate-800 bg-slate-950 px-2.5 py-0.5 text-[10px] font-semibold text-slate-400">
              {criteriaCount} criteri{criteriaCount !== 1 ? "a" : "on"}
            </span>
          </div>

          {/* Collapsible rules preview */}
          <div>
            <button
              type="button"
              onClick={() => setExpanded((p) => !p)}
              className="text-[10px] font-semibold text-slate-500 hover:text-slate-300 transition underline underline-offset-2"
            >
              {expanded ? "Hide rules preview ▲" : "Show rules preview ▼"}
            </button>
            {expanded && (
              <p className="mt-2 text-xs text-slate-400 leading-5 bg-slate-950/50 border border-slate-800 rounded-xl p-3 whitespace-pre-wrap">
                {cfg.rules}
              </p>
            )}
          </div>

          {/* Status badge */}
          {status === "saved" && createdId && (
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>Created!</span>
              <Link
                to={`/judgment/${createdId}`}
                className="underline underline-offset-2 hover:text-emerald-300"
              >
                Open →
              </Link>
            </div>
          )}
          {status === "error" && errorMsg && (
            <div className="flex items-center gap-2 text-xs text-rose-400">
              <XCircle className="h-4 w-4" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Manual editor form (also used for single-config pre-fill)
// ─────────────────────────────────────────────────────────────────
function ManualEditorForm({
  initial,
  onSaved,
}: {
  initial?: Partial<ParsedConfig>;
  onSaved?: (pluginId: string) => void;
}) {
  const navigate = useNavigate();

  const [pluginId, setPluginId] = useState(initial?.pluginId ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [rules, setRules] = useState(initial?.rules ?? "");
  const [inputProperties, setInputProperties] = useState<VisualProperty[]>(
    initial?.inputSchema ? propsToVisual(initial.inputSchema) : [
      { key: "employeeId", title: "Employee ID", description: "Unique identifier for the employee/worker.", type: "string", isRequired: true },
      { key: "evidencePhoto", title: "Evidence Photo", description: "Upload evidence image.", type: "file", isRequired: false }
    ]
  );
  const [visualCriteria, setVisualCriteria] = useState<VisualCriterion[]>(
    initial?.criteria ?? [{
      id: "criterion_general",
      category: "General",
      name: "Guideline Compliance",
      passCriteria: "Check if the worker has met all instructions and requirements listed in the document.",
      severity: "medium",
      weight: 100,
      autoFailIfMissing: false
    }]
  );

  const vars = initial?.variables;
  const [unitLabel, setUnitLabel] = useState(vars?.labels?.unitLabel ?? "Location");
  const [workerLabel, setWorkerLabel] = useState(vars?.labels?.workerLabel ?? "Employee");
  const [managerLabel, setManagerLabel] = useState(vars?.labels?.managerLabel ?? "Manager");
  const [defaultTaskDueHours, setDefaultTaskDueHours] = useState(vars?.actions?.defaultTaskDueHours ?? 24);
  const [dashboardTitle, setDashboardTitle] = useState(vars?.dashboard?.title ?? "Compliance Dashboard");
  const [companyName, setCompanyName] = useState(vars?.dashboard?.company ?? "Demo Corp");
  const [outputSchema, setOutputSchema] = useState(JSON.stringify(initial?.outputSchema ?? DEFAULT_OUTPUT_SCHEMA, null, 2));
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function addProperty() {
    const key = `field_${Date.now().toString().slice(-4)}`;
    setInputProperties((prev) => [...prev, { key, title: "New Field", description: "", type: "string", isRequired: false }]);
  }

  function updateProperty(index: number, updates: Partial<VisualProperty>) {
    setInputProperties((prev) => { const next = [...prev]; next[index] = { ...next[index], ...updates }; return next; });
  }

  function removeProperty(index: number) {
    setInputProperties((prev) => prev.filter((_, i) => i !== index));
  }

  function addCriterion() {
    const id = `criterion_${Date.now().toString().slice(-4)}`;
    setVisualCriteria((prev) => [...prev, { id, category: "General", name: "New Assessment Rule", passCriteria: "Describe what constitutes compliance here...", severity: "medium", weight: 10, autoFailIfMissing: false }]);
  }

  function updateCriterion(index: number, updates: Partial<VisualCriterion>) {
    setVisualCriteria((prev) => { const next = [...prev]; next[index] = { ...next[index], ...updates }; return next; });
  }

  function removeCriterion(index: number) {
    setVisualCriteria((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setErrorMsg(null);
      const body = serializeConfig(pluginId, name, rules, inputProperties, visualCriteria, unitLabel, workerLabel, managerLabel, defaultTaskDueHours, dashboardTitle, companyName, outputSchema);
      const res = await fetch("/api/judgment/configs/direct", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create the configuration");
      }
      if (onSaved) onSaved(pluginId.trim());
      else navigate(`/judgment/${pluginId.trim()}`);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create configuration.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleCreate} className="space-y-8 rounded-3xl border border-slate-800 bg-slate-900/40 p-8 shadow-2xl">
      <div className="space-y-3 border-b border-slate-800 pb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Configuration Parameters
        </div>
        <h2 className="text-2xl font-black tracking-tight text-white font-sans">Visual Configuration Blueprint</h2>
        <p className="max-w-3xl text-sm leading-6 text-slate-400">
          Edit the form fields the user has to fill out, terminology configuration, AI evaluation instructions, and checklist criteria.
        </p>
      </div>

      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400">Basic Information</h3>
        <div className="grid gap-6 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClass}>Configuration ID (Unique slug / pluginId)</span>
            <p className="text-xs text-slate-500 leading-relaxed">Must be alphanumeric, URL-friendly (e.g. <code>fnb_audit</code> or <code>service.team_readiness</code>)</p>
            <input required value={pluginId} onChange={(e) => setPluginId(e.target.value)} className={inputClass} placeholder="e.g. safety_inspection" />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Configuration Name (Official Title)</span>
            <p className="text-xs text-slate-500 leading-relaxed">Readable name displayed on dashboards and menus</p>
            <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="e.g. Kitchen Safety Inspection" />
          </label>
        </div>
        <label className="space-y-2 block">
          <span className={labelClass}>AI Evaluation Instructions / System Rules</span>
          <p className="text-xs text-slate-500 leading-relaxed">Detail prompt instructions guiding the AI evaluation engine about specific compliance requirements.</p>
          <textarea rows={5} required value={rules} onChange={(e) => setRules(e.target.value)} className={textareaClass} placeholder="Review the submission and assess hygiene compliance... Verify that..." />
        </label>
      </div>

      <hr className="border-slate-800" />

      {/* Intake Fields */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400">Intake Form Fields</h3>
            <p className="text-xs text-slate-500 mt-1">Fields rendering dynamically in the submission intake form.</p>
          </div>
          <button type="button" onClick={addProperty} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-blue-400 hover:border-slate-700 hover:text-blue-300 transition">
            <Plus className="h-3.5 w-3.5" /> Add Intake Field
          </button>
        </div>
        <div className="bg-slate-950/30 border border-slate-800 p-4 rounded-2xl text-xs space-y-2 text-slate-400">
          <div className="font-bold text-slate-300 flex items-center gap-1"><HelpCircle className="h-3.5 w-3.5 text-blue-400" />Supported Fields Schema Reference:</div>
          <ul className="list-disc pl-4 space-y-1 text-slate-400 font-mono">
            <li>Text Input (Short): represented as type <b>string</b>.</li>
            <li>Numeric Input: represented as type <b>number</b>.</li>
            <li>Checkbox / Toggle: represented as type <b>boolean</b>.</li>
            <li>File Upload (Single): represented as type <b>string</b> with widget set to <b>file</b>.</li>
            <li>File Upload (Multiple): represented as type <b>array</b> (items string) with widget set to <b>file</b>.</li>
          </ul>
        </div>
        {inputProperties.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">No intake fields defined yet. Add a field to start.</div>
        ) : (
          <div className="space-y-4">
            {inputProperties.map((prop, idx) => (
              <div key={idx} className={cardClass}>
                <button type="button" onClick={() => removeProperty(idx)} className="absolute top-4 right-4 text-slate-500 hover:text-red-400 transition" title="Remove Field"><Trash2 className="h-4 w-4" /></button>
                <div className="grid gap-4 md:grid-cols-3">
                  <label className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Field ID (Key)</span>
                    <input required value={prop.key} onChange={(e) => updateProperty(idx, { key: e.target.value })} className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-white outline-none focus:border-blue-500 font-mono" placeholder="e.g. employeeId" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Field Title (Label)</span>
                    <input required value={prop.title} onChange={(e) => updateProperty(idx, { title: e.target.value })} className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-white outline-none focus:border-blue-500" placeholder="e.g. Employee ID" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Widget Input Type</span>
                    <select value={prop.type} onChange={(e) => updateProperty(idx, { type: e.target.value as any })} className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-white outline-none focus:border-blue-500 cursor-pointer">
                      <option value="string">Text Input (Short)</option>
                      <option value="number">Numeric Input</option>
                      <option value="boolean">Checkbox / Toggle</option>
                      <option value="file">File Upload (Single)</option>
                      <option value="file_array">File Upload (Multiple)</option>
                    </select>
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-[2fr_1fr] items-end">
                  <label className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description (Helper text)</span>
                    <input value={prop.description} onChange={(e) => updateProperty(idx, { description: e.target.value })} className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-slate-300 outline-none focus:border-blue-500" placeholder="Instructions to help user submit correctly..." />
                  </label>
                  <div className="flex items-center gap-2 h-10 pb-2">
                    <input type="checkbox" id={`required-${idx}`} checked={prop.isRequired} onChange={(e) => updateProperty(idx, { isRequired: e.target.checked })} className="h-4 w-4 rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-0 cursor-pointer" />
                    <label htmlFor={`required-${idx}`} className="text-xs font-semibold text-slate-300 cursor-pointer select-none">Is Required field?</label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <hr className="border-slate-800" />

      {/* Criteria */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400">Compliance Assessment Rules</h3>
            <p className="text-xs text-slate-500 mt-1">Specify detailed audit criteria checklist items for evaluations.</p>
          </div>
          <button type="button" onClick={addCriterion} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-blue-400 hover:border-slate-700 hover:text-blue-300 transition">
            <Plus className="h-3.5 w-3.5" /> Add Rule
          </button>
        </div>
        {visualCriteria.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">No evaluation rules defined. Add a rule to start.</div>
        ) : (
          <div className="space-y-4">
            {visualCriteria.map((crit, idx) => (
              <div key={idx} className={cardClass}>
                <button type="button" onClick={() => removeCriterion(idx)} className="absolute top-4 right-4 text-slate-500 hover:text-red-400 transition" title="Remove Rule"><Trash2 className="h-4 w-4" /></button>
                <div className="grid gap-4 md:grid-cols-3">
                  <label className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Criterion ID</span>
                    <input required value={crit.id} onChange={(e) => updateCriterion(idx, { id: e.target.value })} className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-white outline-none focus:border-blue-500 font-mono" placeholder="e.g. criterion_hygiene" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Category</span>
                    <input required value={crit.category} onChange={(e) => updateCriterion(idx, { category: e.target.value })} className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-white outline-none focus:border-blue-500" placeholder="e.g. Food Safety" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rule Label Name</span>
                    <input required value={crit.name} onChange={(e) => updateCriterion(idx, { name: e.target.value })} className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-white outline-none focus:border-blue-500" placeholder="e.g. Temperature checks" />
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-4 items-end">
                  <label className="space-y-1 md:col-span-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Criteria / Guideline description</span>
                    <input required value={crit.passCriteria} onChange={(e) => updateCriterion(idx, { passCriteria: e.target.value })} className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-slate-300 outline-none focus:border-blue-500" placeholder="Instructions of what constitutes passing this criterion..." />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Severity Level</span>
                    <select value={crit.severity} onChange={(e) => updateCriterion(idx, { severity: e.target.value as any })} className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-white outline-none focus:border-blue-500 cursor-pointer">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Weight Score</span>
                    <input type="number" required min={0} max={100} value={crit.weight} onChange={(e) => updateCriterion(idx, { weight: Number(e.target.value) })} className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-white outline-none focus:border-blue-500 font-mono" />
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id={`autofail-${idx}`} checked={crit.autoFailIfMissing} onChange={(e) => updateCriterion(idx, { autoFailIfMissing: e.target.checked })} className="h-4 w-4 rounded border-slate-800 bg-slate-950 text-rose-600 focus:ring-0 cursor-pointer" />
                  <label htmlFor={`autofail-${idx}`} className="text-xs font-semibold text-rose-400 cursor-pointer select-none">Auto-fail whole evaluation if this checklist item fails?</label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <hr className="border-slate-800" />

      {/* Terminology */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400">Interface Settings & Terminology</h3>
        <p className="text-xs text-slate-500 leading-relaxed">Customizes labels used across headers, dashboard summaries, and tasks assignment parameters.</p>
        <div className="grid gap-6 md:grid-cols-3">
          <label className="space-y-2"><span className={labelClass}>Unit Label (e.g. Store / Team / Site)</span><input required value={unitLabel} onChange={(e) => setUnitLabel(e.target.value)} className={inputClass} placeholder="e.g. Branch" /></label>
          <label className="space-y-2"><span className={labelClass}>Worker Label (e.g. Rep / Staff / Employee)</span><input required value={workerLabel} onChange={(e) => setWorkerLabel(e.target.value)} className={inputClass} placeholder="e.g. Worker" /></label>
          <label className="space-y-2"><span className={labelClass}>Manager Label (e.g. Supervisor)</span><input required value={managerLabel} onChange={(e) => setManagerLabel(e.target.value)} className={inputClass} placeholder="e.g. Supervisor" /></label>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <label className="space-y-2"><span className={labelClass}>Dashboard Custom Title</span><input required value={dashboardTitle} onChange={(e) => setDashboardTitle(e.target.value)} className={inputClass} placeholder="e.g. Restaurant Safety Inspector" /></label>
          <label className="space-y-2"><span className={labelClass}>Company Name</span><input required value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputClass} placeholder="e.g. Demo F&B Group" /></label>
          <label className="space-y-2"><span className={labelClass}>Task Due Hours (SLA Time)</span><input type="number" required min={1} value={defaultTaskDueHours} onChange={(e) => setDefaultTaskDueHours(Number(e.target.value))} className={`${inputClass} font-mono`} /></label>
        </div>
      </div>

      <hr className="border-slate-800" />

      {/* Output Schema (advanced) */}
      <details className="group rounded-2xl border border-slate-800 bg-slate-950/20 overflow-hidden">
        <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 hover:bg-slate-900/40 select-none">
          <span className="flex items-center gap-2"><Code2 className="h-4 w-4 text-blue-500" />Advanced developer settings: Output Schema JSON</span>
          <span className="transition group-open:rotate-180">▼</span>
        </summary>
        <div className="border-t border-slate-800 p-5 space-y-4">
          <p className="text-xs text-slate-500">The Output Schema contract defines the structured payload the evaluation LLM must return. Modify this only if you want to alter the database results structure.</p>
          <textarea rows={10} value={outputSchema} onChange={(e) => setOutputSchema(e.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 font-mono text-xs leading-6 text-white outline-none focus:border-blue-500 focus:bg-slate-950 transition" />
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-xs font-bold text-slate-300 mb-2">Output fields preview:</div>
            <div className="grid gap-2 text-[10px] font-mono text-slate-400 grid-cols-2 md:grid-cols-3">
              {summarizeOutputFields(DEFAULT_OUTPUT_SCHEMA).map((field) => (
                <span key={field} className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1">{field}</span>
              ))}
            </div>
          </div>
        </div>
      </details>

      {errorMsg && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 flex items-start gap-2.5 text-sm text-red-200">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-6">
        <Link to="/judgment" className="rounded-xl border border-slate-800 bg-slate-950 px-5 py-2.5 text-xs font-bold text-slate-300 transition hover:border-slate-700 hover:text-white">Cancel</Link>
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60">
          <Save className="h-3.5 w-3.5" />
          {saving ? "Creating..." : "Create Configuration"}
        </button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────
export default function CreateJudgmentConfig() {
  const navigate = useNavigate();

  // Step 1: upload / parsing
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Step 2: preview
  const [generatedConfigs, setGeneratedConfigs] = useState<ParsedConfig[] | null>(null);
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());
  const [cardNames, setCardNames] = useState<string[]>([]);
  const [cardPluginIds, setCardPluginIds] = useState<string[]>([]);
  const [cardStatuses, setCardStatuses] = useState<CardStatus[]>([]);
  const [cardErrors, setCardErrors] = useState<(string | null)[]>([]);
  const [cardCreatedIds, setCardCreatedIds] = useState<(string | null)[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleParse() {
    if (!uploadedFile) return;
    try {
      setParsing(true);
      setParseError(null);
      const formData = new FormData();
      formData.append("file", uploadedFile);
      const res = await fetch("/api/judgment/configs/parse", { method: "POST", body: formData });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to parse the document.");
      }
      const configs: ParsedConfig[] = await res.json();
      setGeneratedConfigs(configs);
      setSelectedIndexes(new Set(configs.map((_, i) => i)));
      setCardNames(configs.map((c) => c.name));
      setCardPluginIds(configs.map((c) => c.pluginId));
      setCardStatuses(configs.map(() => "idle"));
      setCardErrors(configs.map(() => null));
      setCardCreatedIds(configs.map(() => null));
    } catch (err: any) {
      setParseError(err.message || "An error occurred during document analysis.");
    } finally {
      setParsing(false);
    }
  }

  function toggleIndex(i: number) {
    setSelectedIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  async function handleCreateSelected() {
    if (!generatedConfigs) return;
    setSubmitting(true);
    const toCreate = [...selectedIndexes].sort();
    for (const i of toCreate) {
      const cfg = { ...generatedConfigs[i], name: cardNames[i], pluginId: cardPluginIds[i] };
      setCardStatuses((prev) => { const n = [...prev]; n[i] = "saving"; return n; });
      try {
        const res = await fetch("/api/judgment/configs/direct", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cfg),
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to create config.");
        }
        setCardStatuses((prev) => { const n = [...prev]; n[i] = "saved"; return n; });
        setCardCreatedIds((prev) => { const n = [...prev]; n[i] = cardPluginIds[i]; return n; });
      } catch (err: any) {
        setCardStatuses((prev) => { const n = [...prev]; n[i] = "error"; return n; });
        setCardErrors((prev) => { const n = [...prev]; n[i] = err.message; return n; });
      }
    }
    setSubmitting(false);
  }

  const selectedCount = selectedIndexes.size;
  const allSaved = generatedConfigs !== null && cardStatuses.every((s) => s === "saved" || s === "idle") && cardStatuses.some((s) => s === "saved");

  // If generated 1 config → go straight to manual editor pre-filled
  const singleConfig = generatedConfigs?.length === 1 ? generatedConfigs[0] : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/judgment"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 transition hover:border-slate-700 hover:text-white"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white font-sans">Create Config</h1>
              <p className="text-xs text-slate-400">Add a new dynamic evaluation flow</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto mt-8 max-w-5xl px-6 space-y-8">

        {/* ── STEP 1: Upload panel ── */}
        {!generatedConfigs && (
          <section className="rounded-3xl border border-blue-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950/20 p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Upload className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Import from Document</h3>
                <p className="text-xs text-slate-400 mt-0.5">Upload a PDF, Markdown, or Word document — the AI will identify all evaluation contexts and generate config drafts automatically.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <div className="relative flex h-20 items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950 hover:border-slate-700 transition">
                <input
                  type="file"
                  accept=".pdf,.md,.txt,.docx"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) setUploadedFile(f); }}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
                <div className="flex items-center gap-3 text-slate-400">
                  <FileText className="h-5 w-5 text-blue-400" />
                  <span className="text-xs">{uploadedFile ? uploadedFile.name : "Drag & drop or click to upload a document (PDF, MD, DOCX, TXT)"}</span>
                </div>
              </div>
              <button
                type="button"
                disabled={parsing || !uploadedFile}
                onClick={handleParse}
                className="h-20 px-6 rounded-2xl bg-blue-600 text-xs font-bold text-white transition hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col justify-center items-center gap-1.5"
              >
                <span>{parsing ? "Analyzing Document..." : "Import from Document"}</span>
                <span className="text-[10px] opacity-75 font-normal">Extracts schemas & criteria</span>
              </button>
            </div>

            {parsing && (
              <div className="flex items-center gap-2 text-xs text-blue-300 bg-blue-500/5 border border-blue-500/20 p-3 rounded-xl">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                <span>Analyzing the document structure to draft rules, intake schema, variables, and evaluation checklist...</span>
              </div>
            )}

            {parseError && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 flex items-start gap-2.5 text-sm text-red-200">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <span>{parseError}</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <div className="h-px flex-1 bg-slate-800" />
              <span className="text-xs text-slate-600 font-semibold">or build manually below</span>
              <div className="h-px flex-1 bg-slate-800" />
            </div>
          </section>
        )}

        {/* ── STEP 2: Preview panel (N configs) ── */}
        {generatedConfigs && generatedConfigs.length > 1 && !singleConfig && (
          <section className="space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Layers className="h-5 w-5 text-blue-400" />
                  <h2 className="text-lg font-bold text-white">
                    Found {generatedConfigs.length} evaluation context{generatedConfigs.length !== 1 ? "s" : ""} in this document
                  </h2>
                </div>
                <p className="text-xs text-slate-400">Select the configs you want to create. You can edit the name and ID before confirming.</p>
              </div>
              <button
                type="button"
                onClick={() => { setGeneratedConfigs(null); setUploadedFile(null); }}
                className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-2 transition"
              >
                ← Re-upload
              </button>
            </div>

            <div className="space-y-4">
              {generatedConfigs.map((cfg, i) => (
                <GeneratedConfigCard
                  key={i}
                  index={i}
                  cfg={{ ...cfg, name: cardNames[i] ?? cfg.name, pluginId: cardPluginIds[i] ?? cfg.pluginId }}
                  checked={selectedIndexes.has(i)}
                  onToggle={() => toggleIndex(i)}
                  status={cardStatuses[i] ?? "idle"}
                  errorMsg={cardErrors[i]}
                  createdId={cardCreatedIds[i]}
                  onNameChange={(v) => setCardNames((prev) => { const n = [...prev]; n[i] = v; return n; })}
                  onPluginIdChange={(v) => setCardPluginIds((prev) => { const n = [...prev]; n[i] = v; return n; })}
                />
              ))}
            </div>

            {/* Bottom action bar */}
            <div className="sticky bottom-4 z-30 flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/90 p-4 backdrop-blur shadow-2xl">
              <span className="text-xs text-slate-400">
                {selectedCount} of {generatedConfigs.length} selected
              </span>
              <div className="flex items-center gap-3">
                {allSaved && (
                  <button type="button" onClick={() => navigate("/judgment")} className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
                    View all configs →
                  </button>
                )}
                <button
                  type="button"
                  disabled={selectedCount === 0 || submitting || allSaved}
                  onClick={handleCreateSelected}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-3.5 w-3.5" />
                  {submitting ? "Creating..." : `Create Selected (${selectedCount})`}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ── STEP 2 (single result): Pre-fill manual editor ── */}
        {singleConfig && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-blue-300 bg-blue-500/5 border border-blue-500/20 px-3 py-2 rounded-xl">
                <CheckCircle2 className="h-4 w-4 text-blue-400" />
                <span>1 evaluation context found — form pre-filled. Review and confirm below.</span>
              </div>
              <button type="button" onClick={() => { setGeneratedConfigs(null); setUploadedFile(null); }} className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-2">← Re-upload</button>
            </div>
            <ManualEditorForm
              initial={singleConfig}
              onSaved={(id) => navigate(`/judgment/${id}`)}
            />
          </div>
        )}

        {/* ── Manual editor (no upload result) ── */}
        {!generatedConfigs && <ManualEditorForm />}

      </main>
    </div>
  );
}
