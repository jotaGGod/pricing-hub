import { Copy, FileText, FolderOpen, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChannelSelector } from "../../components/ChannelSelector";
import { CostsPercentTable } from "../../components/CostsPercentTable";
import { ManualCostsEditor } from "../../components/ManualCostsEditor";
import { MoneyInput } from "../../components/MoneyInput";
import { PercentInput } from "../../components/PercentInput";
import { ProductCard } from "../../components/ProductCard";
import { ResultsPanel } from "../../components/ResultsPanel";
import { listChannels } from "../../services/channels";
import { createProduct } from "../../services/products";
import { calculatePricing } from "../../services/pricing";
import { createSimulation } from "../../services/simulations";
import type { NormalizedChannel, PricingInput, PricingMode, PricingResult } from "../../types";
import { formatBRL } from "../../utils/money";
import { pricingFormSchema } from "../../utils/validation";

const initialPricingInput: PricingInput = {
  product_title: "",
  product_cost_cents: 0,
  sale_price_cents: null,
  desired_margin_bps: 3000,
  seller_discount_bps: 0,
  channel_code: "site",
  channel_options: {
    category_code: "",
    override_commission_bps: null,
    override_fixed_fee_cents: null,
    enabled_options: {}
  },
  manual_costs: [],
  ads_bps: 0,
  fixed_costs_bps: 0,
  tax_bps: 400,
  extra_fees_bps: 0,
  logistic_cost: {
    type: "fixed_amount",
    amount_cents: 0,
    bps: 0
  },
  mode: "target_margin"
};

export function PricingPage() {
  const navigate = useNavigate();
  const [channels, setChannels] = useState<NormalizedChannel[]>([]);
  const [form, setForm] = useState<PricingInput>(initialPricingInput);
  const [result, setResult] = useState<PricingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [savingSimulation, setSavingSimulation] = useState(false);

  useEffect(() => {
    listChannels()
      .then((items) => {
        setChannels(items);
        setForm((current) =>
          !items.some((item) => item.code === current.channel_code) && items[0]
            ? { ...current, channel_code: items[0].code }
            : current
        );
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Falha ao carregar canais"));
  }, []);

  const selectedChannel = useMemo(
    () => channels.find((channel) => channel.code === form.channel_code) ?? channels[0],
    [channels, form.channel_code]
  );

  useEffect(() => {
    const parsed = pricingFormSchema.safeParse(form);
    if (!parsed.success) {
      setResult(null);
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      calculatePricing(parsed.data)
        .then((nextResult) => {
          if (active) {
            setResult(nextResult);
          }
        })
        .catch((err) => {
          if (active) {
            setResult(null);
            setError(err instanceof Error ? err.message : "Falha no calculo");
          }
        })
        .finally(() => {
          if (active) {
            setLoading(false);
          }
        });
    }, 420);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [form]);

  function updateMode(mode: PricingMode) {
    setForm({
      ...form,
      mode,
      sale_price_cents: mode === "analyze_sale_price" ? form.sale_price_cents ?? result?.recommended_sale_price_cents ?? 0 : null
    });
  }

  async function saveProduct() {
    if (!form.product_title.trim()) {
      setNotice("Informe o titulo do produto.");
      return;
    }
    setSavingProduct(true);
    setNotice(null);
    try {
      await createProduct({
        title: form.product_title,
        cost_cents: form.product_cost_cents,
        default_channel_code: form.channel_code,
        category: form.channel_options.category_code || null
      });
      setNotice("Produto salvo.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Falha ao salvar produto.");
    } finally {
      setSavingProduct(false);
    }
  }

  async function saveSimulation() {
    if (!result) {
      setNotice("Calcule antes de salvar.");
      return;
    }
    setSavingSimulation(true);
    setNotice(null);
    try {
      await createSimulation({
        title: form.product_title.trim() || "Simulacao",
        channel_code: form.channel_code,
        input: form,
        result
      });
      setNotice("Simulacao salva.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Falha ao salvar simulacao.");
    } finally {
      setSavingSimulation(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-normal sm:text-4xl">Precificadora</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">Calculo completo de precificacao de produtos</p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={() => navigate("/products")}>
            <FolderOpen size={17} />
            Meus Produtos
          </button>
          <button type="button" className="btn-secondary" onClick={() => window.print()}>
            <FileText size={17} />
            PDF
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setForm({ ...form, product_title: `${form.product_title || "Produto"} copia` })}
          >
            <Copy size={17} />
            Duplicar
          </button>
          <button type="button" className="btn-primary" onClick={saveSimulation} disabled={savingSimulation}>
            <Save size={17} />
            Salvar
          </button>
        </div>
      </div>

      <ChannelSelector
        channels={channels}
        value={form.channel_code}
        onChange={(channel_code) =>
          setForm({
            ...form,
            channel_code,
            channel_options: {
              category_code: "",
              override_commission_bps: null,
              override_fixed_fee_cents: null,
              enabled_options: {}
            }
          })
        }
      />

      {notice ? (
        <div className="rounded-md border border-mint/30 bg-mint/10 px-4 py-3 text-sm font-bold text-emerald-600 dark:text-mint">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5">
          <ProductCard value={form} channels={channels} onChange={setForm} onSave={saveProduct} saving={savingProduct} />

          <section className="glass-card p-5">
            <h2 className="mb-4 text-base font-black">Modo</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                className={modeButtonClass(form.mode === "target_margin")}
                onClick={() => updateMode("target_margin")}
              >
                Margem desejada
              </button>
              <button
                type="button"
                className={modeButtonClass(form.mode === "analyze_sale_price")}
                onClick={() => updateMode("analyze_sale_price")}
              >
                Preco de venda
              </button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {form.mode === "target_margin" ? (
                <PercentInput
                  label="Margem desejada"
                  value={form.desired_margin_bps ?? 0}
                  onChange={(desired_margin_bps) => setForm({ ...form, desired_margin_bps })}
                />
              ) : (
                <MoneyInput
                  label="Preco de venda"
                  value={form.sale_price_cents ?? 0}
                  onChange={(sale_price_cents) => setForm({ ...form, sale_price_cents })}
                />
              )}
              <div className="rounded-md border border-slate-200 p-3 dark:border-line">
                <p className="field-label">Preco base atual</p>
                <p className="mt-2 text-2xl font-black">
                  {formatBRL(form.mode === "analyze_sale_price" ? form.sale_price_cents ?? 0 : result?.recommended_sale_price_cents ?? 0)}
                </p>
              </div>
            </div>
          </section>

          <ChannelOptionsPanel channel={selectedChannel} value={form} onChange={setForm} />
          <CostsPercentTable value={form} onChange={setForm} />
          <ManualCostsEditor value={form.manual_costs} onChange={(manual_costs) => setForm({ ...form, manual_costs })} />
        </div>
        <ResultsPanel result={result} loading={loading} error={error} />
      </div>
    </div>
  );
}

function ChannelOptionsPanel({
  channel,
  value,
  onChange
}: {
  channel?: NormalizedChannel;
  value: PricingInput;
  onChange: (value: PricingInput) => void;
}) {
  if (!channel) {
    return null;
  }

  return (
    <section className="glass-card p-5">
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-black">{channel.name}</h2>
        {channel.source_note ? <p className="text-xs text-slate-500 dark:text-slate-400">{channel.source_note}</p> : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {channel.fee_rules.categories.length > 0 ? (
          <label className="block space-y-2 md:col-span-2">
            <span className="field-label">Categoria do canal</span>
            <select
              className="input-base"
              value={value.channel_options.category_code}
              onChange={(event) =>
                onChange({
                  ...value,
                  channel_options: { ...value.channel_options, category_code: event.target.value }
                })
              }
            >
              <option value="">Default</option>
              {channel.fee_rules.categories.map((category) => (
                <option key={category.code} value={category.code}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <PercentInput
          label="Comissao manual"
          value={value.channel_options.override_commission_bps ?? channel.fee_rules.default_commission_bps}
          onChange={(override_commission_bps) =>
            onChange({
              ...value,
              channel_options: { ...value.channel_options, override_commission_bps }
            })
          }
        />
        <MoneyInput
          label="Tarifa manual"
          value={value.channel_options.override_fixed_fee_cents ?? channel.fee_rules.fixed_fee_cents}
          onChange={(override_fixed_fee_cents) =>
            onChange({
              ...value,
              channel_options: { ...value.channel_options, override_fixed_fee_cents }
            })
          }
        />

        {channel.fee_rules.options.map((option) => (
          <label
            key={option.code}
            className="flex min-h-12 items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm font-bold dark:border-line"
          >
            <span>{option.label}</span>
            <input
              type="checkbox"
              checked={value.channel_options.enabled_options[option.code] ?? option.default_enabled}
              onChange={(event) =>
                onChange({
                  ...value,
                  channel_options: {
                    ...value.channel_options,
                    enabled_options: {
                      ...value.channel_options.enabled_options,
                      [option.code]: event.target.checked
                    }
                  }
                })
              }
            />
          </label>
        ))}
      </div>
    </section>
  );
}

function modeButtonClass(active: boolean) {
  return [
    "h-11 rounded-md border px-4 text-sm font-black transition",
    active
      ? "border-mint bg-mint text-slate-950"
      : "border-slate-200 bg-white text-slate-600 dark:border-line dark:bg-slate-950/30 dark:text-slate-300"
  ].join(" ");
}
