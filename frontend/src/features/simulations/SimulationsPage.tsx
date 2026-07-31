import { Pencil, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { listChannels } from "../../services/channels";
import {
  deleteSimulation,
  listSimulations,
  simulationChannelCode,
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
  const [channelNames, setChannelNames] = useState<Record<string, string>>({});
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
    listChannels()
      .then((channels) => {
        setChannelNames(Object.fromEntries(channels.map((channel) => [channel.code, channel.name])));
      })
      .catch(() => undefined);
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

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-line">
                <th className="section-title px-4 py-2">Simulação</th>
                <th className="section-title px-4 py-2">Quantidade</th>
                <th className="section-title px-4 py-2">Preço de custo</th>
                <th className="section-title px-4 py-2">Preço de venda</th>
                <th className="section-title px-4 py-2">Margem</th>
                <th className="section-title px-4 py-2">Lucro</th>
                <th className="section-title px-4 py-2">Plataforma</th>
                <th className="w-20 px-4 py-2" aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {simulations.map((simulation) => {
                const result = simulationResult(simulation);
                const input = simulationInput(simulation);
                const title = simulationTitle(simulation);
                const description = simulationDescription(simulation);
                const subtitle = description || (input?.product_title !== title ? input?.product_title : "");
                const channelCode = simulationChannelCode(simulation);
                const platform = channelNames[channelCode] || channelCode || "—";
                return (
                  <tr
                    key={simulationID(simulation)}
                    className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50 dark:border-line dark:hover:bg-white/[0.03]"
                  >
                    <td className="min-w-[180px] px-4 py-1.5">
                      <p className="font-semibold">{title}</p>
                      {subtitle ? <p className="truncate text-xs text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-1.5 text-slate-500 dark:text-slate-400">
                      {input?.quantity ? input.quantity : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-1.5 text-slate-500 dark:text-slate-400">
                      {result ? formatBRL(result.product_cost_cents) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-1.5">
                      {result ? formatBRL(result.recommended_sale_price_cents) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-1.5">{result ? formatBPS(result.margin_bps) : "—"}</td>
                    <td className="whitespace-nowrap px-4 py-1.5">{result ? formatBRL(result.net_profit_cents) : "—"}</td>
                    <td className="whitespace-nowrap px-4 py-1.5 text-slate-500 dark:text-slate-400">{platform}</td>
                    <td className="px-4 py-1.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button type="button" className="icon-btn h-8 w-8" title="Editar" onClick={() => openEdit(simulation)}>
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn h-8 w-8"
                          title="Excluir"
                          onClick={async () => {
                            await deleteSimulation(simulationID(simulation));
                            reload();
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {simulations.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">Nenhuma simulação salva ainda.</div>
        ) : null}
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
