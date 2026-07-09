import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  deleteSimulation,
  listSimulations,
  simulationCreatedAt,
  simulationID,
  simulationResult,
  simulationTitle
} from "../../services/simulations";
import type { Simulation } from "../../types";
import { formatBPS, formatBRL } from "../../utils/money";

export function SimulationsPage() {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    listSimulations()
      .then(setSimulations)
      .catch((err) => setError(err instanceof Error ? err.message : "Falha ao carregar simulacoes"));
  }

  useEffect(() => {
    reload();
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-black">Simulacoes</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">Historico salvo</p>
      </div>

      {error ? <p className="text-sm font-bold text-orange-500">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {simulations.map((simulation) => {
          const result = simulationResult(simulation);
          return (
            <article key={simulationID(simulation)} className="glass-card p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-black">{simulationTitle(simulation)}</h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{simulationCreatedAt(simulation)}</p>
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  title="Excluir"
                  onClick={async () => {
                    await deleteSimulation(simulationID(simulation));
                    reload();
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              {result ? (
                <div className="grid grid-cols-2 gap-3">
                  <Metric label="Preco" value={formatBRL(result.recommended_sale_price_cents)} />
                  <Metric label="Margem" value={formatBPS(result.margin_bps)} />
                  <Metric label="Lucro" value={formatBRL(result.net_profit_cents)} />
                  <Metric label="Custo" value={formatBRL(result.total_cost_cents)} />
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 p-3 dark:border-line">
      <p className="text-xs font-bold uppercase tracking-normal text-slate-400">{label}</p>
      <p className="mt-1 font-black">{value}</p>
    </div>
  );
}
