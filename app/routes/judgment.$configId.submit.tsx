import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ChevronRight, FileText, Plus, Send, Upload, X } from "lucide-react";
import { getConfigLabels } from "~/modules/judgment";
import { getDefaultFieldValue, getFieldEntries, getFieldWidget } from "~/lib/judgment-ui.utils";

export default function EvidenceIntake() {
  const { configId } = useParams();
  const navigate = useNavigate();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [jsonTexts, setJsonTexts] = useState<Record<string, string>>({});
  const [fieldFiles, setFieldFiles] = useState<Record<string, File[]>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void fetchConfig();
  }, [configId]);

  async function fetchConfig() {
    try {
      setLoading(true);
      const res = await fetch(`/api/judgment/configs/${configId}`);
      if (!res.ok) throw new Error("Failed to load the selected configuration");
      const data = await res.json();
      setConfig(data);

      const initial: Record<string, any> = {};
      const initialJsonTexts: Record<string, string> = {};
      for (const { key, property } of getFieldEntries(data)) {
        if (property.type === "object") {
          initial[key] = {};
          // Pre-populate sub-schema attributes if they exist
          const subProperties = property.properties ?? {};
          const templateObj: Record<string, any> = {};
          for (const [subKey, subProp] of Object.entries(subProperties)) {
            templateObj[subKey] = getDefaultFieldValue(subProp as any);
          }
          initialJsonTexts[key] = JSON.stringify(templateObj, null, 2);
        } else {
          initial[key] = getDefaultFieldValue(property);
        }
      }
      setFormValues(initial);
      setJsonTexts(initialJsonTexts);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function updateField(key: string, value: any) {
    setFormValues((current) => ({ ...current, [key]: value }));
  }

  // Removed general file upload handlers as we now use dynamic field-level file inputs

  function handleFieldFileChange(key: string, isArray: boolean, e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(e.target.files ?? []);
    if (selectedFiles.length > 0) {
      if (isArray) {
        setFieldFiles((current) => {
          const existing = current[key] ?? [];
          const updated = [...existing, ...selectedFiles];
          updateField(key, updated.map(f => f.name));
          return { ...current, [key]: updated };
        });
      } else {
        const file = selectedFiles[0];
        setFieldFiles((current) => ({ ...current, [key]: [file] }));
        updateField(key, file.name);
      }
    }
  }

  function handleRemoveFieldFile(key: string, isArray: boolean, indexToRemove?: number) {
    setFieldFiles((current) => {
      const updated = { ...current };
      if (isArray && typeof indexToRemove === "number") {
        const existing = current[key] ?? [];
        const filtered = existing.filter((_, i) => i !== indexToRemove);
        if (filtered.length === 0) {
          delete updated[key];
          updateField(key, []);
        } else {
          updated[key] = filtered;
          updateField(key, filtered.map(f => f.name));
        }
      } else {
        delete updated[key];
        updateField(key, "");
      }
      return updated;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSubmitting(true);
      const submissionPayload = { ...formValues };
      // Parse edited JSON textareas
      for (const key of Object.keys(jsonTexts)) {
        try {
          submissionPayload[key] = JSON.parse(jsonTexts[key]);
        } catch {
          throw new Error(`Invalid JSON format in the "${key}" field.`);
        }
      }

      // Enforce required file fields before submitting
      for (const { key, property, isRequired } of getFieldEntries(config)) {
        const widget = getFieldWidget(key, property);
        if (widget === "file" && isRequired && !(fieldFiles[key]?.length > 0)) {
          throw new Error(`"${property.title ?? key}" is required. Please upload a file.`);
        }
      }

      const formData = new FormData();
      formData.set("inputData", JSON.stringify(submissionPayload));
      Object.values(fieldFiles).forEach((filesList) => {
        filesList.forEach((file) => formData.append("files", file));
      });

      const res = await fetch(`/api/judgment/configs/${configId}/submit`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to submit evidence");
      }

      navigate(`/judgment/${configId}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
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
          <h3 className="mb-2 text-lg font-bold">Unable to load the intake form</h3>
          <p className="mb-4 text-sm">{error || "The selected configuration could not be loaded."}</p>
          <Link to="/" className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200">
            Back to Hub
          </Link>
        </div>
      </div>
    );
  }

  const labels = getConfigLabels(config);
  const fieldEntries = getFieldEntries(config);
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link
              to={`/judgment/${configId}`}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 transition hover:border-slate-700 hover:text-white"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white">Submit Evidence</h1>
              <p className="text-xs text-slate-400">{config.name}</p>
            </div>
          </div>
          <div className="hidden rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400 md:block">
            {labels.unitLabel} / {labels.workerLabel}
          </div>
        </div>
      </header>

      <main className="mx-auto mt-8 max-w-6xl px-6">
        <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl">
          <div className="mb-8 space-y-3 border-b border-slate-800 pb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
              <Plus className="h-3.5 w-3.5" />
              Dynamic Intake
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">Evidence intake from JSON Schema</h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-400">
              The form below is rendered from the configuration's input schema. Optional UI hints can change the control type without changing the schema contract.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {fieldEntries.map(({ key, property, title, isRequired }) => {
              const widget = getFieldWidget(key, property);
              const value = formValues[key] ?? getDefaultFieldValue(property);
              const isCriterionField = key === "criterionId" && Array.isArray(config.criteria) && config.criteria.length > 0;
              const isArrayField = property.type === "array";
              const label = title || key;
              const helper = property.description || "";

              return (
                <div key={key} className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                  <label className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                    {label}
                    {isRequired && <span className="text-rose-400">*</span>}
                  </label>
                  {helper ? <p className="text-xs leading-5 text-slate-500">{helper}</p> : null}

                  {isCriterionField ? (
                    <select
                      required={isRequired}
                      value={value}
                      onChange={(e) => updateField(key, e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 text-sm text-white outline-none transition focus:border-blue-500"
                    >
                      <option value="">Select a criterion</option>
                      {config.criteria.map((criterion: any) => (
                        <option key={criterion.id} value={criterion.id}>
                          {criterion.category ? `[${criterion.category}] ` : ""}
                          {criterion.name}
                        </option>
                      ))}
                    </select>
                  ) : widget === "select" ? (
                    <select
                      required={isRequired}
                      value={value}
                      onChange={(e) => updateField(key, e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 text-sm text-white outline-none transition focus:border-blue-500"
                    >
                      <option value="">Select an option</option>
                      {property.enum?.map((option: string) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : widget === "file" ? (
                    <div className="space-y-2">
                      {isArrayField ? (
                        <>
                          {(fieldFiles[key] || []).map((file: File, fileIdx: number) => (
                            <div key={`${file.name}-${fileIdx}`} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5">
                              <div className="flex min-w-0 items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-400" />
                                <span className="truncate text-sm text-slate-200">{file.name}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveFieldFile(key, true, fileIdx)}
                                className="text-slate-500 transition hover:text-red-400"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                          <div className="relative flex h-11 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 hover:border-slate-700 transition">
                            <input
                              type="file"
                              multiple
                              required={isRequired && !(fieldFiles[key]?.length > 0)}
                              onChange={(e) => handleFieldFileChange(key, true, e)}
                              className="absolute inset-0 cursor-pointer opacity-0"
                              accept=".pdf,image/png,image/jpeg,image/webp,image/gif"
                            />
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                              <Upload className="h-4 w-4 text-blue-400" />
                              <span>Upload Files</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        fieldFiles[key]?.[0] ? (
                          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5">
                            <div className="flex min-w-0 items-center gap-2">
                              <FileText className="h-4 w-4 text-blue-400" />
                              <span className="truncate text-sm text-slate-200">{fieldFiles[key][0].name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveFieldFile(key, false)}
                              className="text-slate-500 transition hover:text-red-400"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="relative flex h-11 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 hover:border-slate-700 transition">
                            <input
                              type="file"
                              required={isRequired}
                              onChange={(e) => handleFieldFileChange(key, false, e)}
                              className="absolute inset-0 cursor-pointer opacity-0"
                              accept=".pdf,image/png,image/jpeg,image/webp,image/gif"
                            />
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                              <Upload className="h-4 w-4 text-blue-400" />
                              <span>Upload File</span>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  ) : widget === "checkbox" ? (
                    <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) => updateField(key, e.target.checked)}
                        className="h-4 w-4 rounded border-slate-700 bg-slate-900"
                      />
                      <span>{helper || `Toggle ${label}`}</span>
                    </label>
                  ) : widget === "number" ? (
                    <input
                      type="number"
                      required={isRequired}
                      value={value}
                      onChange={(e) => updateField(key, e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 text-sm text-white outline-none transition focus:border-blue-500"
                      placeholder={helper || label}
                    />
                  ) : widget === "date" ? (
                    <input
                      type="date"
                      required={isRequired}
                      value={value}
                      onChange={(e) => updateField(key, e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 text-sm text-white outline-none transition focus:border-blue-500"
                    />
                  ) : widget === "json" ? (
                    <textarea
                      required={isRequired}
                      rows={6}
                      value={jsonTexts[key] ?? "{}"}
                      onChange={(e) => {
                        const val = e.target.value;
                        setJsonTexts((prev) => ({ ...prev, [key]: val }));
                      }}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 font-mono text-xs text-white outline-none transition focus:border-blue-500"
                      placeholder={`Enter ${label.toLowerCase()} as JSON`}
                    />
                  ) : isArrayField ? (
                    <textarea
                      required={isRequired}
                      rows={4}
                      value={Array.isArray(value) ? value.join("\n") : value}
                      onChange={(e) =>
                        updateField(
                          key,
                          e.target.value
                            .split("\n")
                            .map((item) => item.trim())
                            .filter(Boolean),
                        )
                      }
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
                      placeholder={`Enter one ${label.toLowerCase()} per line`}
                    />
                  ) : (
                    <textarea
                      required={isRequired}
                      rows={key === "note" || key === "transcript" || key === "description" ? 5 : 3}
                      value={value}
                      onChange={(e) => updateField(key, e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
                      placeholder={helper || `Enter ${label.toLowerCase()}`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* General uploads section removed in favor of dynamic schema-based file inputs */}

          <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-800 pt-6">
            <Link to={`/judgment/${configId}`} className="rounded-xl border border-slate-800 bg-slate-950 px-5 py-2.5 text-xs font-bold text-slate-300 transition hover:border-slate-700 hover:text-white">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-3.5 w-3.5" />
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
