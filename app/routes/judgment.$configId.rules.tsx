import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ChevronRight, Save, Code2, SlidersHorizontal, Plus, Trash2, HelpCircle } from "lucide-react";
import { getConfigLabels } from "~/modules/judgment";
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

const cardClass = "rounded-2xl border border-slate-800 bg-slate-950/40 p-5 space-y-4 relative group";
const labelClass = "text-xs font-bold uppercase tracking-wider text-slate-400 block";
const inputClass = "h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 text-sm text-white outline-none transition focus:border-blue-500";
const textareaClass = "w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-blue-500";

export default function JudgmentRuleEditor() {
  const { configId } = useParams();
  const navigate = useNavigate();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States for Visual Form Builder
  const [name, setName] = useState("");
  const [rules, setRules] = useState("");
  const [inputProperties, setInputProperties] = useState<VisualProperty[]>([]);
  const [visualCriteria, setVisualCriteria] = useState<VisualCriterion[]>([]);
  
  // States for Custom Labels / Variables
  const [unitLabel, setUnitLabel] = useState("");
  const [workerLabel, setWorkerLabel] = useState("");
  const [managerLabel, setManagerLabel] = useState("");
  const [defaultTaskDueHours, setDefaultTaskDueHours] = useState(24);
  const [dashboardTitle, setDashboardTitle] = useState("");
  const [companyName, setCompanyName] = useState("");

  // Advanced developer raw JSON
  const [outputSchema, setOutputSchema] = useState("{}");
  const [saving, setSaving] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    void fetchConfig();
  }, [configId]);

  async function fetchConfig() {
    try {
      setLoading(true);
      const res = await fetch(`/api/judgment/configs/${configId}`);
      if (!res.ok) throw new Error("Failed to load configuration");
      const data = await res.json();
      setConfig(data);
      
      setName(data.name || "");
      setRules(data.rules || "");
      
      // Parse inputSchema properties to visual properties array
      const props = data.inputSchema?.properties || {};
      const requiredFields = data.inputSchema?.required || [];
      const parsedProps = Object.entries(props).map(([key, val]: [string, any]) => {
        let type: "string" | "number" | "boolean" | "file" | "file_array" = "string";
        if (val.type === "array" && val.items?.type === "string" && val["x-ui"]?.widget === "file") {
          type = "file_array";
        } else if (val["x-ui"]?.widget === "file") {
          type = "file";
        } else if (val.type === "number" || val.type === "integer") {
          type = "number";
        } else if (val.type === "boolean") {
          type = "boolean";
        }
        
        return {
          key,
          title: val.title || key,
          description: val.description || "",
          type,
          isRequired: requiredFields.includes(key),
        };
      });
      setInputProperties(parsedProps);
      
      // Parse criteria
      setVisualCriteria(data.criteria || []);
      
      // Parse variables & labels
      const vars = data.variables || {};
      setUnitLabel(vars.labels?.unitLabel || "");
      setWorkerLabel(vars.labels?.workerLabel || "");
      setManagerLabel(vars.labels?.managerLabel || "");
      setDefaultTaskDueHours(vars.actions?.defaultTaskDueHours ?? 24);
      setDashboardTitle(vars.dashboard?.title || "");
      setCompanyName(vars.dashboard?.company || "");

      // Raw Output Schema
      setOutputSchema(JSON.stringify(data.outputSchema || {}, null, 2));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Input properties actions
  function addProperty() {
    const key = `field_${Date.now().toString().slice(-4)}`;
    setInputProperties((prev) => [
      ...prev,
      {
        key,
        title: "New Field",
        description: "",
        type: "string",
        isRequired: false,
      },
    ]);
  }

  function updateProperty(index: number, updates: Partial<VisualProperty>) {
    setInputProperties((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  }

  function removeProperty(index: number) {
    setInputProperties((prev) => prev.filter((_, i) => i !== index));
  }

  // Criteria actions
  function addCriterion() {
    const id = `criterion_${Date.now().toString().slice(-4)}`;
    setVisualCriteria((prev) => [
      ...prev,
      {
        id,
        category: "General",
        name: "New Assessment Rule",
        passCriteria: "Describe what constitutes compliance here...",
        severity: "medium",
        weight: 10,
        autoFailIfMissing: false,
      },
    ]);
  }

  function updateCriterion(index: number, updates: Partial<VisualCriterion>) {
    setVisualCriteria((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  }

  function removeCriterion(index: number) {
    setVisualCriteria((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setJsonError(null);

      // Serialize Visual properties back to standard JSON Schema input schema properties object
      const propertiesObj: Record<string, any> = {};
      const requiredFields: string[] = [];
      
      inputProperties.forEach((prop) => {
        if (!prop.key.trim()) return;
        
        const key = prop.key.trim();
        const schemaProp: any = {
          title: prop.title,
          description: prop.description,
        };
        
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
        if (prop.isRequired) {
          requiredFields.push(key);
        }
      });
      
      const serializedInputSchema = {
        type: "object",
        properties: propertiesObj,
        required: requiredFields,
      };

      // Serialize variables back to structured object
      const serializedVariables = {
        labels: {
          unitLabel: unitLabel.trim(),
          workerLabel: workerLabel.trim(),
          managerLabel: managerLabel.trim(),
        },
        actions: {
          defaultTaskDueHours: Number(defaultTaskDueHours),
        },
        dashboard: {
          title: dashboardTitle.trim(),
          company: companyName.trim(),
        },
      };

      // Parse output schema
      const parsedOutputSchema = JSON.parse(outputSchema);

      const res = await fetch(`/api/judgment/configs/${configId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          rules,
          inputSchema: serializedInputSchema,
          outputSchema: parsedOutputSchema,
          criteria: visualCriteria.map((c) => ({
            ...c,
            weight: Number(c.weight),
          })),
          variables: serializedVariables,
        }),
      });

      if (!res.ok) throw new Error("Failed to update the configuration");
      navigate(`/judgment/${configId}`);
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        setJsonError("Advanced Output Schema JSON is invalid. Fix the syntax and save again.");
      } else {
        alert(err.message);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-8 text-slate-100">
        <div className="max-w-md rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-300">
          <h3 className="mb-2 text-lg font-bold">Unable to load the editor</h3>
          <p className="mb-4 text-sm">{error || "The configuration could not be loaded."}</p>
          <Link to="/" className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200">
            Back to Hub
          </Link>
        </div>
      </div>
    );
  }

  const outputFields = summarizeOutputFields(config.outputSchema);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link
              to={`/judgment/${configId}`}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 transition hover:border-slate-700 hover:text-white"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white">Visual Configuration Editor</h1>
              <p className="text-xs text-slate-400">{config.name}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto mt-8 max-w-5xl px-6">
        <form onSubmit={handleSave} className="space-y-8 rounded-3xl border border-slate-800 bg-slate-900/40 p-8 shadow-2xl">
          
          {/* Header Description */}
          <div className="space-y-3 border-b border-slate-800 pb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Dynamic Form & Rule Builder
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">Edit module contract visually</h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-400">
              Modify the dynamically rendered form fields, validation rules evaluated by the judgment engine, and managers' Terminology settings.
            </p>
          </div>

          {/* Section 1: Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400">Basic Information</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <label className="space-y-2">
                <span className={labelClass}>Configuration Name</span>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
            
            <label className="space-y-2 block">
              <span className={labelClass}>AI Evaluation Instruction Rules (Markdown Prompt)</span>
              <p className="text-xs text-slate-500 leading-relaxed">
                Direct prompt guidelines given to the evaluation engine (LLM) detailing specific SOP compliance boundaries, thresholds, and triggers.
              </p>
              <textarea
                rows={5}
                required
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                className={textareaClass}
              />
            </label>
          </div>

          <hr className="border-slate-800" />

          {/* Section 2: Input Schema Field Builder */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400">Intake Form Fields</h3>
                <p className="text-xs text-slate-500 mt-1">Configure fields rendered on the submission page. Key field must be unique.</p>
              </div>
              <button
                type="button"
                onClick={addProperty}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-blue-400 hover:border-slate-700 hover:text-blue-300 transition"
              >
                <Plus className="h-3.5 w-3.5" /> Add Field
              </button>
            </div>

            {inputProperties.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
                No intake fields defined yet. Add a field to start.
              </div>
            ) : (
              <div className="space-y-4">
                {inputProperties.map((prop, idx) => (
                  <div key={idx} className={cardClass}>
                    <button
                      type="button"
                      onClick={() => removeProperty(idx)}
                      className="absolute top-4 right-4 text-slate-500 hover:text-red-400 transition"
                      title="Remove Field"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    
                    <div className="grid gap-4 md:grid-cols-3">
                      <label className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Field ID (Key)</span>
                        <input
                          required
                          value={prop.key}
                          onChange={(e) => updateProperty(idx, { key: e.target.value })}
                          className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-white outline-none focus:border-blue-500 font-mono"
                          placeholder="e.g. employeeId"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Field Title (Label)</span>
                        <input
                          required
                          value={prop.title}
                          onChange={(e) => updateProperty(idx, { title: e.target.value })}
                          className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-white outline-none focus:border-blue-500"
                          placeholder="e.g. Employee ID"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Input Control Widget Type</span>
                        <select
                          value={prop.type}
                          onChange={(e) => updateProperty(idx, { type: e.target.value as any })}
                          className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-white outline-none focus:border-blue-500 cursor-pointer"
                        >
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
                        <input
                          value={prop.description}
                          onChange={(e) => updateProperty(idx, { description: e.target.value })}
                          className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-slate-300 outline-none focus:border-blue-500"
                          placeholder="Provide explanation instructions for user..."
                        />
                      </label>
                      <div className="flex items-center gap-2 h-10 pb-2">
                        <input
                          type="checkbox"
                          id={`required-${idx}`}
                          checked={prop.isRequired}
                          onChange={(e) => updateProperty(idx, { isRequired: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-0 cursor-pointer"
                        />
                        <label htmlFor={`required-${idx}`} className="text-xs font-semibold text-slate-300 cursor-pointer select-none">
                          Is Required field?
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr className="border-slate-800" />

          {/* Section 3: Criteria Builder */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400">Compliance Assessment Rules</h3>
                <p className="text-xs text-slate-500 mt-1">Specify detailed audit criteria checklist items for evaluations.</p>
              </div>
              <button
                type="button"
                onClick={addCriterion}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-blue-400 hover:border-slate-700 hover:text-blue-300 transition"
              >
                <Plus className="h-3.5 w-3.5" /> Add Rule
              </button>
            </div>

            {visualCriteria.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
                No evaluation rules defined. Add a rule to start.
              </div>
            ) : (
              <div className="space-y-4">
                {visualCriteria.map((crit, idx) => (
                  <div key={idx} className={cardClass}>
                    <button
                      type="button"
                      onClick={() => removeCriterion(idx)}
                      className="absolute top-4 right-4 text-slate-500 hover:text-red-400 transition"
                      title="Remove Rule"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <div className="grid gap-4 md:grid-cols-3">
                      <label className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Criterion ID</span>
                        <input
                          required
                          value={crit.id}
                          onChange={(e) => updateCriterion(idx, { id: e.target.value })}
                          className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-white outline-none focus:border-blue-500 font-mono"
                          placeholder="e.g. criterion_labeled"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Category</span>
                        <input
                          required
                          value={crit.category}
                          onChange={(e) => updateCriterion(idx, { category: e.target.value })}
                          className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-white outline-none focus:border-blue-500"
                          placeholder="e.g. Food Safety"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rule Label Name</span>
                        <input
                          required
                          value={crit.name}
                          onChange={(e) => updateCriterion(idx, { name: e.target.value })}
                          className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-white outline-none focus:border-blue-500"
                          placeholder="e.g. Storage labeling"
                        />
                      </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-4 items-end">
                      <label className="space-y-1 md:col-span-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Criteria / Guideline description</span>
                        <input
                          required
                          value={crit.passCriteria}
                          onChange={(e) => updateCriterion(idx, { passCriteria: e.target.value })}
                          className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-slate-300 outline-none focus:border-blue-500"
                          placeholder="e.g. Items must be labeled with name and date."
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Severity Level</span>
                        <select
                          value={crit.severity}
                          onChange={(e) => updateCriterion(idx, { severity: e.target.value as any })}
                          className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-white outline-none focus:border-blue-500 cursor-pointer"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Weight Score</span>
                        <input
                          type="number"
                          required
                          min={0}
                          max={100}
                          value={crit.weight}
                          onChange={(e) => updateCriterion(idx, { weight: Number(e.target.value) })}
                          className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-white outline-none focus:border-blue-500 font-mono"
                        />
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`autofail-${idx}`}
                        checked={crit.autoFailIfMissing}
                        onChange={(e) => updateCriterion(idx, { autoFailIfMissing: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-800 bg-slate-950 text-rose-600 focus:ring-0 cursor-pointer"
                      />
                      <label htmlFor={`autofail-${idx}`} className="text-xs font-semibold text-rose-400 cursor-pointer select-none">
                        Auto-fail whole evaluation if this checklist item fails?
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr className="border-slate-800" />

          {/* Section 4: Terminology Settings & Variables */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400">Interface Settings & Terminology</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Customizes labels used across headers, dashboard summaries, and tasks assignment parameters.
            </p>
            <div className="grid gap-6 md:grid-cols-3">
              <label className="space-y-2">
                <span className={labelClass}>Unit Label (e.g. Location / Store)</span>
                <input
                  required
                  value={unitLabel}
                  onChange={(e) => setUnitLabel(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Location"
                />
              </label>
              <label className="space-y-2">
                <span className={labelClass}>Worker Label (e.g. Staff / Rep)</span>
                <input
                  required
                  value={workerLabel}
                  onChange={(e) => setWorkerLabel(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Staff"
                />
              </label>
              <label className="space-y-2">
                <span className={labelClass}>Manager Label (e.g. Supervisor)</span>
                <input
                  required
                  value={managerLabel}
                  onChange={(e) => setManagerLabel(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Area Manager"
                />
              </label>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <label className="space-y-2">
                <span className={labelClass}>Dashboard Custom Title</span>
                <input
                  required
                  value={dashboardTitle}
                  onChange={(e) => setDashboardTitle(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. F&B Cleanliness Audit"
                />
              </label>
              <label className="space-y-2">
                <span className={labelClass}>Company Name</span>
                <input
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Demo F&B Group"
                />
              </label>
              <label className="space-y-2">
                <span className={labelClass}>Task Due Hours (SLA Time)</span>
                <input
                  type="number"
                  required
                  min={1}
                  value={defaultTaskDueHours}
                  onChange={(e) => setDefaultTaskDueHours(Number(e.target.value))}
                  className={`${inputClass} font-mono`}
                />
              </label>
            </div>
          </div>

          <hr className="border-slate-800" />

          {/* Section 5: Advanced (Collapsible Output Schema) */}
          <details className="group rounded-2xl border border-slate-800 bg-slate-950/20 overflow-hidden">
            <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 hover:bg-slate-900/40 select-none">
              <span className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-blue-500" /> Advanced developer settings: Output Schema JSON
              </span>
              <span className="transition group-open:rotate-180">▼</span>
            </summary>
            <div className="border-t border-slate-800 p-5 space-y-4">
              <p className="text-xs text-slate-500">
                The Output Schema contract defines the structured payload the evaluation LLM must return. Modify this only if you want to alter the database results structure.
              </p>
              <textarea
                rows={10}
                value={outputSchema}
                onChange={(e) => setOutputSchema(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 font-mono text-xs leading-6 text-white outline-none focus:border-blue-500 transition"
              />
              
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="text-xs font-bold text-slate-300 mb-2">Output fields preview:</div>
                <div className="grid gap-2 text-[10px] font-mono text-slate-400 grid-cols-2 md:grid-cols-3">
                  {outputFields.map((field) => (
                    <span key={field} className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1">{field}</span>
                  ))}
                </div>
              </div>
            </div>
          </details>

          {jsonError && <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">{jsonError}</div>}

          {/* Actions Bar */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-6">
            <Link
              to={`/judgment/${configId}`}
              className="rounded-xl border border-slate-800 bg-slate-950 px-5 py-2.5 text-xs font-bold text-slate-300 transition hover:border-slate-700 hover:text-white"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving..." : "Save Configuration"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
