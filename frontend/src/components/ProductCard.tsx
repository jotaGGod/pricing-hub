import { Save } from "lucide-react";
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
    <section className="glass-card p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-black uppercase tracking-normal text-slate-500 dark:text-slate-300">Produto</h2>
        <button type="button" className="btn-secondary h-9 px-3" onClick={onSave} disabled={saving}>
          <Save size={16} />
          Produto
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block space-y-2 md:col-span-2">
          <span className="field-label">Título</span>
          <input
            className="input-base"
            value={value.product_title}
            maxLength={120}
            onChange={(event) => onChange({ ...value, product_title: event.target.value })}
          />
        </label>
        <MoneyInput
          label="Custo do produto"
          value={value.product_cost_cents}
          onChange={(product_cost_cents) => onChange({ ...value, product_cost_cents })}
        />
        <label className="block space-y-2">
          <span className="field-label">Categoria</span>
          <input
            className="input-base"
            value={value.channel_options.category_code}
            onChange={(event) =>
              onChange({
                ...value,
                channel_options: { ...value.channel_options, category_code: event.target.value }
              })
            }
          />
        </label>
      </div>
    </section>
  );
}
