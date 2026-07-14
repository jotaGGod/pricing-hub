import { Plus, Trash2 } from "lucide-react";
import { useRef } from "react";
import type { ManualCost, PricingInput } from "../types";
import { MoneyInput } from "./MoneyInput";
import { PercentInput } from "./PercentInput";

type CostsPercentTableProps = {
  value: PricingInput;
  onChange: (value: PricingInput) => void;
};

let manualCostKeyCounter = 0;

function createManualCostKey() {
  manualCostKeyCounter += 1;
  return `pricing-cost-${manualCostKeyCounter}`;
}

export function CostsPercentTable({ value, onChange }: CostsPercentTableProps) {
  const itemKeysRef = useRef<string[]>([]);

  if (itemKeysRef.current.length < value.manual_costs.length) {
    itemKeysRef.current = [
      ...itemKeysRef.current,
      ...Array.from({ length: value.manual_costs.length - itemKeysRef.current.length }, createManualCostKey)
    ];
  }

  if (itemKeysRef.current.length > value.manual_costs.length) {
    itemKeysRef.current = itemKeysRef.current.slice(0, value.manual_costs.length);
  }

  function updateManualCost(index: number, cost: ManualCost) {
    onChange({
      ...value,
      manual_costs: value.manual_costs.map((item, itemIndex) => (itemIndex === index ? cost : item))
    });
  }

  function addManualCost() {
    itemKeysRef.current = [...itemKeysRef.current, createManualCostKey()];
    onChange({
      ...value,
      manual_costs: [
        ...value.manual_costs,
        {
          name: "Custo extra",
          type: "fixed_amount",
          amount_cents: 0,
          bps: 0,
          enabled: true
        }
      ]
    });
  }

  function removeManualCost(index: number) {
    itemKeysRef.current = itemKeysRef.current.filter((_, itemIndex) => itemIndex !== index);
    onChange({
      ...value,
      manual_costs: value.manual_costs.filter((_, itemIndex) => itemIndex !== index)
    });
  }

  return (
    <section className="glass-card p-3">
      <h2 className="section-title mb-2.5">Custos</h2>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <PercentInput
          label="Impostos"
          value={value.tax_bps}
          onChange={(tax_bps) => onChange({ ...value, tax_bps })}
        />
        <PercentInput label="Ads" value={value.ads_bps} onChange={(ads_bps) => onChange({ ...value, ads_bps })} />
        <PercentInput
          label="Custos fixos"
          value={value.fixed_costs_bps}
          onChange={(fixed_costs_bps) => onChange({ ...value, fixed_costs_bps })}
        />
        <PercentInput
          label="Taxas extras"
          value={value.extra_fees_bps}
          onChange={(extra_fees_bps) => onChange({ ...value, extra_fees_bps })}
        />
        <PercentInput
          label="Desconto vendedor"
          value={value.seller_discount_bps}
          onChange={(seller_discount_bps) => onChange({ ...value, seller_discount_bps })}
        />

        <MoneyInput
          label="Logística"
          value={value.logistic_cost.amount_cents}
          onChange={(amount_cents) =>
            onChange({
              ...value,
              logistic_cost: {
                type: "fixed_amount",
                amount_cents,
                bps: 0
              }
            })
          }
        />
      </div>

      <div className="mt-3 border-t border-slate-200/80 pt-3 dark:border-line">
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <p className="section-title">Custos adicionais</p>
          <button type="button" className="btn-secondary h-9 px-3" onClick={addManualCost}>
            <Plus size={15} />
            Adicionar custo
          </button>
        </div>
        <div className="space-y-2">
          {value.manual_costs.map((cost, index) => (
            <div
              key={itemKeysRef.current[index]}
              className="rounded-[10px] border border-slate-200/80 bg-slate-50/70 p-2.5 shadow-sm dark:border-line dark:bg-black/15"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_76px_40px] gap-2">
                <input
                  aria-label={`Nome do custo ${index + 1}`}
                  className="input-base"
                  value={cost.name}
                  maxLength={80}
                  onChange={(event) => updateManualCost(index, { ...cost, name: event.target.value })}
                />
                <select
                  aria-label={`Tipo do custo ${index + 1}`}
                  className="input-base px-2"
                  value={cost.type}
                  onChange={(event) =>
                    updateManualCost(index, { ...cost, type: event.target.value as ManualCost["type"] })
                  }
                >
                  <option value="fixed_amount">R$</option>
                  <option value="percentage">%</option>
                </select>
                <button
                  type="button"
                  className="icon-btn h-9 w-9"
                  onClick={() => removeManualCost(index)}
                  title="Remover custo"
                  aria-label={`Remover custo ${index + 1}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                {cost.type === "fixed_amount" ? (
                  <MoneyInput
                    label={`Valor de ${cost.name}`}
                    hideLabel
                    value={cost.amount_cents}
                    onChange={(amount_cents) => updateManualCost(index, { ...cost, amount_cents })}
                  />
                ) : (
                  <PercentInput
                    label={`Percentual de ${cost.name}`}
                    hideLabel
                    value={cost.bps}
                    onChange={(bps) => updateManualCost(index, { ...cost, bps })}
                  />
                )}
                <label className="flex min-h-9 items-center gap-2 px-1 text-xs font-semibold text-slate-500 dark:text-slate-300">
                  <input
                    className="h-4 w-4 accent-ember"
                    type="checkbox"
                    checked={cost.enabled}
                    onChange={(event) => updateManualCost(index, { ...cost, enabled: event.target.checked })}
                  />
                  Ativo
                </label>
              </div>
            </div>
          ))}

          {value.manual_costs.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-slate-300 px-3 py-3 text-center text-xs text-slate-500 dark:border-line dark:text-slate-400">
              Adicione um custo em reais ou porcentagem quando precisar.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
