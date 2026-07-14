import { BadgeDollarSign, Save } from "lucide-react";
import type { PricingInput } from "../types";
import { MoneyInput } from "./MoneyInput";

type ProductCardProps = {
  value: PricingInput;
  onChange: (value: PricingInput) => void;
  onSave: () => void;
  saving: boolean;
};

export function ProductCard({ value, onChange, onSave, saving }: ProductCardProps) {
  return (
    <section className="glass-card p-3">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h2 className="section-title">Produto</h2>
        <button type="button" className="btn-secondary h-9 px-3" onClick={onSave} disabled={saving}>
          <Save size={16} />
          Produto
        </button>
      </div>
      <div className="grid items-end gap-2.5 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="block space-y-1.5 md:col-span-2">
          <span className="field-label">Título</span>
          <input
            className="input-base"
            aria-label="Título"
            value={value.product_title}
            maxLength={120}
            onChange={(event) => onChange({ ...value, product_title: event.target.value })}
          />
        </div>
        <MoneyInput
          label="Custo do produto"
          value={value.product_cost_cents}
          onChange={(product_cost_cents) => onChange({ ...value, product_cost_cents })}
        />
        <div className="space-y-1.5">
          <span className="field-label flex items-center gap-1.5 text-ember dark:text-pink-200">
            <BadgeDollarSign size={14} />
            Preço de venda
          </span>
          <MoneyInput
            label="Preço de venda"
            hideLabel
            value={value.sale_price_cents ?? 0}
            inputClassName="border-ember/60 bg-ember/[0.055] text-center text-base font-bold tabular-nums text-ember shadow-[0_0_0_3px_rgba(255,63,135,0.07),0_8px_20px_rgba(255,63,135,0.08)] dark:border-ember/45 dark:bg-ember/[0.08] dark:text-pink-100"
            onChange={(sale_price_cents) =>
              onChange({
                ...value,
                sale_price_cents,
                desired_margin_bps: null,
                mode: "analyze_sale_price"
              })
            }
          />
        </div>
        <div className="block space-y-1.5 md:col-span-2">
          <span className="field-label">Categoria</span>
          <input
            className="input-base"
            aria-label="Categoria"
            value={value.channel_options.category_code}
            onChange={(event) =>
              onChange({
                ...value,
                channel_options: { ...value.channel_options, category_code: event.target.value }
              })
            }
          />
        </div>
      </div>
    </section>
  );
}
