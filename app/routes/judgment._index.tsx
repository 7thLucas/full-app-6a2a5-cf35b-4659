import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Layers, Search, ClipboardList, Sparkles, Plus } from "lucide-react";
import { getConfigLabels } from "~/modules/judgment";

interface JudgmentCriterion {
  id: string;
  category?: string;
  name: string;
  passCriteria: string;
  severity?: string;
  weight?: number;
}

interface JudgmentConfig {
  pluginId: string;
  name: string;
  rules: string;
  criteria: JudgmentCriterion[];
  variables?: Record<string, any>;
}

export default function JudgmentConfigsList() {
  const [configs, setConfigs] = useState<JudgmentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    void fetchConfigs();
  }, []);

  async function fetchConfigs() {
    try {
      setLoading(true);
      const res = await fetch("/api/judgment/configs");
      if (!res.ok) throw new Error("Failed to load judgment configurations");
      const data = await res.json();
      setConfigs(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredConfigs = configs.filter((config) => {
    const query = searchQuery.toLowerCase();
    return (
      config.name.toLowerCase().includes(query) ||
      config.pluginId.toLowerCase().includes(query) ||
      config.rules.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Judgment Configurations</h1>
              <p className="text-xs text-slate-400">Reusable evaluation templates and submission adapters</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/judgment/new"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-500"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Config
            </Link>
            <Link
              to="/"
              className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-700 hover:text-white"
            >
              Back to Hub
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 pt-10">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
              <Layers className="h-3.5 w-3.5" />
              Config Registry
            </div>
            <h2 className="text-3xl font-black tracking-tight text-white">Choose a goal configuration</h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-400">
              Each configuration drives its own schema, rules, and canonical output shape. The module stays generic and only renders configuration metadata plus submission history.
            </p>
          </div>

          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, ID, or rules..."
              className="h-11 w-full rounded-xl border border-slate-800 bg-slate-900 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-300">{error}</div>
        ) : filteredConfigs.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/50 py-20 text-center">
            <p className="text-sm text-slate-400">No configurations match this search.</p>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mt-4 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-700 hover:text-white"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredConfigs.map((config) => {
              const labels = getConfigLabels(config);
              return (
                <article
                  key={config.pluginId}
                  className="group flex flex-col justify-between rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 p-6 shadow-xl transition hover:-translate-y-1 hover:border-slate-700"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white">{config.name}</h3>
                        <p className="text-xs font-mono text-slate-500">{config.pluginId}</p>
                      </div>
                      <div className="rounded-xl bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-300">
                        {config.criteria?.length || 0} criteria
                      </div>
                    </div>

                    <p className="min-h-[96px] text-sm leading-6 text-slate-400">{config.rules}</p>

                    <div className="grid grid-cols-3 gap-3 text-[11px] text-slate-400">
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                        <div className="mb-1 font-bold uppercase tracking-wider text-slate-500">Unit</div>
                        <div className="text-slate-200">{labels.unitLabel}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                        <div className="mb-1 font-bold uppercase tracking-wider text-slate-500">Worker</div>
                        <div className="text-slate-200">{labels.workerLabel}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                        <div className="mb-1 font-bold uppercase tracking-wider text-slate-500">Manager</div>
                        <div className="text-slate-200">{labels.managerLabel}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
                    <Link
                      to={`/judgment/${config.pluginId}/submit`}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-700 hover:text-white"
                    >
                      <ClipboardList className="h-3.5 w-3.5" />
                      Submit Evidence
                    </Link>
                    <Link
                      to={`/judgment/${config.pluginId}`}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-500"
                    >
                      Open
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
