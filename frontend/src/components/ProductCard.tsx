import { BadgeDollarSign } from "lucide-react";
import { useEffect, useState } from "react";
import { productCost, productID, productTitle } from "../services/products";
import type { PricingInput, Product } from "../types";
import { MoneyInput } from "./MoneyInput";

type ProductCardProps = {
  value: PricingInput;
  onChange: (value: PricingInput) => void;
  products: Product[];
};

export function ProductCard({ value, onChange, products }: ProductCardProps) {
  const [quantityDraft, setQuantityDraft] = useState(String(value.quantity || 1));

  useEffect(() => {
    setQuantityDraft(String(value.quantity || 1));
  }, [value.quantity]);

  function selectProduct(productId: string) {
    const selected = products.find((product) => productID(product) === productId);
    const unitCostCents = selected ? productCost(selected) : 0;
    const quantity = Math.max(1, value.quantity || 1);
    onChange({
      ...value,
      product_id: selected ? productId : null,
      product_title: selected ? productTitle(selected) : "",
      product_unit_cost_cents: unitCostCents,
      product_cost_cents: unitCostCents * quantity
    });
  }

  function updateQuantity(rawValue: string) {
    if (rawValue !== "" && !/^\d+$/.test(rawValue)) {
      return;
    }
    setQuantityDraft(rawValue);
    if (rawValue === "") {
      return;
    }
    const quantity = Number.parseInt(rawValue, 10);
    onChange({
      ...value,
      quantity,
      product_cost_cents: value.product_unit_cost_cents * quantity
    });
  }

  function commitQuantity() {
    const parsed = Number.parseInt(quantityDraft, 10);
    const quantity = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    setQuantityDraft(String(quantity));
    onChange({
      ...value,
      quantity,
      product_cost_cents: value.product_unit_cost_cents * quantity
    });
  }

  return (
    <section className="glass-card p-3">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h2 className="section-title">Produto</h2>
      </div>
      <div className="grid items-end gap-2.5 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="block space-y-1.5 md:col-span-2">
          <span className="field-label">Produto</span>
          <select
            className="input-base"
            aria-label="Produto"
            value={value.product_id ?? ""}
            onChange={(event) => selectProduct(event.target.value)}
          >
            <option value="">{products.length === 0 ? "Nenhum produto cadastrado" : "Selecione um produto"}</option>
            {products.map((product) => (
              <option key={productID(product)} value={productID(product)}>
                {productTitle(product)}
              </option>
            ))}
          </select>
        </div>

        <div className="block space-y-1.5">
          <span className="field-label">Quantidade</span>
          <input
            type="number"
            className="input-base"
            aria-label="Quantidade"
            inputMode="numeric"
            min="1"
            step="1"
            placeholder="1"
            value={quantityDraft}
            onKeyDown={(event) => {
              if (["e", "E", "+", "-", "."].includes(event.key)) {
                event.preventDefault();
              }
            }}
            onChange={(event) => updateQuantity(event.target.value)}
            onBlur={commitQuantity}
          />
        </div>
        <MoneyInput label="Custo do produto" value={value.product_cost_cents} onChange={() => undefined} disabled />

        <div className="block space-y-1.5 md:col-span-2">
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
      </div>
    </section>
  );
}
