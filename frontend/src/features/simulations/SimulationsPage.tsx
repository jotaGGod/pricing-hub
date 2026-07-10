import { Pencil, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  deleteSimulation,
  listSimulations,
  simulationChannelCode,
  simulationCreatedAt,
  simulationDescription,
  simulationID,
  simulationInput,
  simulationResult,
  simulationTitle,
  updateSimulation
} from "../../services/simulations";
import type { Simulation } from "../../types";
import { formatBPS, formatBRL } from "../../utils/money";

export function SimulationsPage() {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Simulation | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editProductTitle, setEditProductTitle] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  function reload() {
    listSimulations()
      .then((items) => {
        setSimulations(items);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Falha ao carregar simulações"));
  }

  useEffect(() => {
    reload();
  }, []);

  function openEdit(simulation: Simulation) {
    const input = simulationInput(simulation);
    setEditing(simulation);
    setEditTitle(simulationTitle(simulation));
    setEditDescription(simulationDescription(simulation));
    setEditProductTitle(input?.product_title ?? "");
    setError(null);
  }

  async function saveEdit() {
    if (!editing) {
      return;
    }

    const id = simulationID(editing);
    const input = simulationInput(editing);
    const result = simulationResult(editing);
    if (!id || !input || !result) {
      setError("Simulação sem dados completos para editar.");
      return;
    }

    const nextInput = {
      ...input,
      product_title: editProductTitle.trim() || input.product_title
    };
    setSavingEdit(true);
    setError(null);
    try {
      await updateSimulation(id, {
        title: editTitle.trim() || "Simulação",
        description: editDescription.trim() || null,
        channel_code: simulationChannelCode(editing) || nextInput.channel_code,
        input: nextInput,
        result
      });
      setEditing(null);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao editar simulação");
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-black">Simulações</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">Histórico salvo</p>
      </div>

      {error ? <p className="text-sm font-bold text-orange-500">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {simulations.map((simulation) => {
          const result = simulationResult(simulation);
          const input = simulationInput(simulation);
          const description = simulationDescription(simulation);
          return (
            <article key={simulationID(simulation)} className="glass-card p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-black">{simulationTitle(simulation)}</h2>
                  {description || input?.product_title ? (
                    <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-300">
                      {description || input?.product_title}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{simulationCreatedAt(simulation)}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" className="icon-btn" title="Editar" onClick={() => openEdit(simulation)}>
                    <Pencil size={16} />
                  </button>
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
              </div>
              {result ? (
                <div className="grid grid-cols-2 gap-3">
                  <Metric label="Preço" value={formatBRL(result.recommended_sale_price_cents)} />
                  <Metric label="Margem" value={formatBPS(result.margin_bps)} />
                  <Metric label="Lucro" value={formatBRL(result.net_profit_cents)} />
                  <Metric label="Custo" value={formatBRL(result.total_cost_cents)} />
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 px-4 py-8 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-base font-black">Editar simulação</h2>
              <button type="button" className="icon-btn" title="Fechar" onClick={() => setEditing(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4">
              <label className="block space-y-2">
                <span className="field-label">Nome da simulação</span>
                <input
                  className="input-base"
                  value={editTitle}
                  maxLength={120}
                  onChange={(event) => setEditTitle(event.target.value)}
                />
              </label>
              <label className="block space-y-2">
                <span className="field-label">Descrição da simulação</span>
                <input
                  className="input-base"
                  value={editDescription}
                  maxLength={180}
                  onChange={(event) => setEditDescription(event.target.value)}
                />
              </label>
              <label className="block space-y-2">
                <span className="field-label">Título do produto</span>
                <input
                  className="input-base"
                  value={editProductTitle}
                  maxLength={120}
                  onChange={(event) => setEditProductTitle(event.target.value)}
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={saveEdit} disabled={savingEdit}>
                <Save size={17} />
                Salvar
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
