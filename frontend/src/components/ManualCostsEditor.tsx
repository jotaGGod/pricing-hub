import { Plus, Trash2 } from "lucide-react";
import { useRef } from "react";
import type { ManualCost } from "../types";
import { MoneyInput } from "./MoneyInput";
import { PercentInput } from "./PercentInput";

type ManualCostsEditorProps = {
  value: ManualCost[];
  onChange: (value: ManualCost[]) => void;
};

let manualCostKeyCounter = 0;

function createManualCostKey() {
  manualCostKeyCounter += 1;
  return `manual-cost-${manualCostKeyCounter}`;
}

export function ManualCostsEditor({ value, onChange }: ManualCostsEditorProps) {
  const itemKeysRef = useRef<string[]>([]);

  if (itemKeysRef.current.length < value.length) {
    itemKeysRef.current = [
      ...itemKeysRef.current,
      ...Array.from({ length: value.length - itemKeysRef.current.length }, createManualCostKey)
    ];
  }

  if (itemKeysRef.current.length > value.length) {
    itemKeysRef.current = itemKeysRef.current.slice(0, value.length);
  }

  function update(index: number, cost: ManualCost) {
    onChange(value.map((item, itemIndex) => (itemIndex === index ? cost : item)));
  }

  function add() {
    itemKeysRef.current = [...itemKeysRef.current, createManualCostKey()];
    onChange([
      ...value,
      {
        name: "Custo extra",
        type: "fixed_amount",
        amount_cents: 0,
        bps: 0,
        enabled: true
      }
    ]);
  }

  function remove(index: number) {
    itemKeysRef.current = itemKeysRef.current.filter((_, itemIndex) => itemIndex !== index);
    onChange(value.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <section className="glass-card p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-black uppercase tracking-normal text-slate-500 dark:text-slate-300">Custos Manuais</h2>
        <button type="button" className="icon-btn" onClick={add} title="Adicionar custo">
          <Plus size={18} />
        </button>
      </div>
      <div className="space-y-3">
        {value.map((cost, index) => (
          <div key={itemKeysRef.current[index]} className="rounded-md border border-slate-200 p-3 dark:border-line">
            <div className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_92px_auto_40px] sm:items-center">
              <input
                className="input-base h-10"
                value={cost.name}
                onChange={(event) => update(index, { ...cost, name: event.target.value })}
              />
              <select
                className="input-base h-10"
                value={cost.type}
                onChange={(event) => update(index, { ...cost, type: event.target.value as ManualCost["type"] })}
              >
                <option value="fixed_amount">R$</option>
                <option value="percentage">%</option>
              </select>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={cost.enabled}
                  onChange={(event) => update(index, { ...cost, enabled: event.target.checked })}
                />
                Ativo
              </label>
              <button
                type="button"
                className="icon-btn h-10 w-10"
                onClick={() => remove(index)}
                title="Remover custo"
              >
                <Trash2 size={16} />
              </button>
            </div>
            {cost.type === "fixed_amount" ? (
              <MoneyInput
                label="Valor"
                value={cost.amount_cents}
                onChange={(amount_cents) => update(index, { ...cost, amount_cents })}
              />
            ) : (
              <PercentInput label="Percentual" value={cost.bps} onChange={(bps) => update(index, { ...cost, bps })} />
            )}
          </div>
        ))}
        {value.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500 dark:border-line dark:text-slate-400">
            Nenhum custo manual
          </div>
        ) : null}
      </div>
    </section>
  );
}
