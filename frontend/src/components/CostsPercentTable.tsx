import type { PricingInput } from "../types";
import { MoneyInput } from "./MoneyInput";
import { PercentInput } from "./PercentInput";

type CostsPercentTableProps = {
  value: PricingInput;
  onChange: (value: PricingInput) => void;
};

export function CostsPercentTable({ value, onChange }: CostsPercentTableProps) {
  const logisticIsFixed = value.logistic_cost.type === "fixed_amount";

  return (
    <section className="glass-card p-5">
      <h2 className="mb-4 text-base font-black">Custos Percentuais</h2>
      <div className="grid gap-4 md:grid-cols-2">
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
        <label className="block space-y-2">
          <span className="field-label">Logistica</span>
          <select
            className="input-base"
            value={value.logistic_cost.type}
            onChange={(event) =>
              onChange({
                ...value,
                logistic_cost: {
                  ...value.logistic_cost,
                  type: event.target.value as "fixed_amount" | "percentage"
                }
              })
            }
          >
            <option value="fixed_amount">Valor fixo</option>
            <option value="percentage">Percentual</option>
          </select>
        </label>
        {logisticIsFixed ? (
          <MoneyInput
            label="Valor logistica"
            value={value.logistic_cost.amount_cents}
            onChange={(amount_cents) =>
              onChange({ ...value, logistic_cost: { ...value.logistic_cost, amount_cents } })
            }
          />
        ) : (
          <PercentInput
            label="Percentual logistica"
            value={value.logistic_cost.bps}
            onChange={(bps) => onChange({ ...value, logistic_cost: { ...value.logistic_cost, bps } })}
          />
        )}
      </div>
    </section>
  );
}
