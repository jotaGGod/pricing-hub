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
  channel_code: "shopee",
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

const pricingDraftStorageKey = "pricing-hub:pricing-draft:v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readPricingDraft() {
  if (typeof window === "undefined") {
    return initialPricingInput;
  }

  try {
    const rawDraft = window.localStorage.getItem(pricingDraftStorageKey);
    if (!rawDraft) {
      return initialPricingInput;
    }

    const parsedDraft: unknown = JSON.parse(rawDraft);
    if (!isRecord(parsedDraft)) {
      return initialPricingInput;
    }

    const channelOptions = isRecord(parsedDraft.channel_options) ? parsedDraft.channel_options : {};
    const logisticCost = isRecord(parsedDraft.logistic_cost) ? parsedDraft.logistic_cost : {};
    const draft = {
      ...initialPricingInput,
      ...parsedDraft,
      channel_options: {
        ...initialPricingInput.channel_options,
        ...channelOptions,
        enabled_options: isRecord(channelOptions.enabled_options) ? channelOptions.enabled_options : {}
      },
      logistic_cost: {
        ...initialPricingInput.logistic_cost,
        ...logisticCost
      }
    };
    const parsed = pricingFormSchema.safeParse(draft);
    return parsed.success ? parsed.data : initialPricingInput;
  } catch {
    return initialPricingInput;
  }
}

function writePricingDraft(form: PricingInput) {
  try {
    window.localStorage.setItem(pricingDraftStorageKey, JSON.stringify(form));
  } catch {
    // Local storage can be blocked in private contexts; losing persistence is non-critical.
  }
}

function zeroPricingResult(): PricingResult {
  return {
    sale_price_cents: 0,
    recommended_sale_price_cents: 0,
    total_cost_cents: 0,
    product_cost_cents: 0,
    manual_costs_total_cents: 0,
    channel_fee_cents: 0,
    channel_commission_cents: 0,
    channel_fixed_fee_cents: 0,
    tax_cents: 0,
    ads_cents: 0,
    extra_fees_cents: 0,
    net_profit_cents: 0,
    margin_bps: 0,
    markup_bps: 0,
    status: "profit",
    breakdown: [{ label: "Custo do produto", amount_cents: 0 }]
  };
}

function pricingChannels(channels: NormalizedChannel[]) {
  const order = ["shopee", "temu", "tiktok_shop", "shein", "mercado_livre_classico", "mercado_livre_premium", "amazon", "manual"];
  return channels
    .filter((channel) => channel.enabled && channel.code !== "site")
    .sort((first, second) => {
      const firstIndex = order.indexOf(first.code);
      const secondIndex = order.indexOf(second.code);
      const normalizedFirst = firstIndex === -1 ? order.length : firstIndex;
      const normalizedSecond = secondIndex === -1 ? order.length : secondIndex;
      return normalizedFirst - normalizedSecond || first.name.localeCompare(second.name);
    });
}

export function PricingPage() {
  const navigate = useNavigate();
  const [channels, setChannels] = useState<NormalizedChannel[]>([]);
  const [form, setForm] = useState<PricingInput>(() => readPricingDraft());
  const [result, setResult] = useState<PricingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [savingSimulation, setSavingSimulation] = useState(false);

  useEffect(() => {
    listChannels()
      .then((items) => {
        const nextChannels = pricingChannels(items);
        setChannels(nextChannels);
        setForm((current) =>
          !nextChannels.some((item) => item.code === current.channel_code) && nextChannels[0]
            ? { ...current, channel_code: nextChannels[0].code }
            : current
        );
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Falha ao carregar canais"));
  }, []);

  useEffect(() => {
    writePricingDraft(form);
  }, [form]);

  const selectedChannel = useMemo(
    () => channels.find((channel) => channel.code === form.channel_code) ?? channels[0],
    [channels, form.channel_code]
  );

  useEffect(() => {
    if (form.product_cost_cents <= 0) {
      setResult(zeroPricingResult());
      setError(null);
      setLoading(false);
      return;
    }

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
            setError(err instanceof Error ? err.message : "Falha no cálculo");
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

  async function saveProduct() {
    if (!form.product_title.trim()) {
      setNotice("Informe o título do produto.");
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
        title: form.product_title.trim() || "Simulação",
        description: null,
        channel_code: form.channel_code,
        input: form,
        result
      });
      setNotice("Simulação salva.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Falha ao salvar simulação.");
    } finally {
      setSavingSimulation(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-normal sm:text-4xl">Precificador</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">Cálculo completo de precificação de produtos</p>
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
            onClick={() => setForm({ ...form, product_title: `${form.product_title || "Produto"} cópia` })}
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

      <section className="glass-card p-3 sm:p-4">
        <div className="min-w-0 space-y-3">
          <span className="field-label block">Canal</span>
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
        </div>
      </section>

      {notice ? (
        <div className="rounded-md border border-mint/30 bg-mint/10 px-4 py-3 text-sm font-bold text-emerald-600 dark:text-mint">
          {notice}
        </div>
      ) : null}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(300px,0.9fr)_minmax(380px,1.08fr)_minmax(340px,0.92fr)]">
        <div className="space-y-4">
          <ProductCard value={form} channels={channels} onChange={setForm} onSave={saveProduct} saving={savingProduct} />
          <ChannelOptionsPanel channel={selectedChannel} value={form} onChange={setForm} />
        </div>

        <div className="space-y-4">
          <PricingModeCard value={form} result={result} onChange={setForm} />
          <CostsPercentTable value={form} onChange={setForm} />
          <ManualCostsEditor value={form.manual_costs} onChange={(manual_costs) => setForm({ ...form, manual_costs })} />
        </div>

        <div className="space-y-4 xl:sticky xl:top-4">
          <ResultsPanel result={result} loading={loading} error={error} />
        </div>
      </div>
    </div>
  );
}

function PricingModeCard({
  value,
  result,
  onChange
}: {
  value: PricingInput;
  result: PricingResult | null;
  onChange: (value: PricingInput) => void;
}) {
  function updateMode(mode: PricingMode) {
    onChange({
      ...value,
      mode,
      sale_price_cents: mode === "analyze_sale_price" ? value.sale_price_cents ?? result?.recommended_sale_price_cents ?? 0 : null
    });
  }

  return (
    <section className="glass-card p-3 sm:p-4">
      <h2 className="mb-3 text-sm font-black uppercase tracking-normal text-slate-500 dark:text-slate-300">Modo</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          className={modeButtonClass(value.mode === "target_margin")}
          onClick={() => updateMode("target_margin")}
        >
          Margem desejada
        </button>
        <button
          type="button"
          className={modeButtonClass(value.mode === "analyze_sale_price")}
          onClick={() => updateMode("analyze_sale_price")}
        >
          Preço de venda
        </button>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {value.mode === "target_margin" ? (
          <PercentInput
            label="Margem desejada"
            value={value.desired_margin_bps ?? 0}
            onChange={(desired_margin_bps) => onChange({ ...value, desired_margin_bps })}
          />
        ) : (
          <MoneyInput
            label="Preço de venda"
            value={value.sale_price_cents ?? 0}
            onChange={(sale_price_cents) => onChange({ ...value, sale_price_cents })}
          />
        )}
        <div className="rounded-md border border-slate-200 bg-slate-50/80 p-3 dark:border-line dark:bg-slate-950/30">
          <p className="field-label">Preço base atual</p>
          <p className="mt-1 text-2xl font-black">
            {formatBRL(
              value.mode === "analyze_sale_price" ? value.sale_price_cents ?? 0 : result?.recommended_sale_price_cents ?? 0
            )}
          </p>
        </div>
      </div>
    </section>
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
    <section className="glass-card p-3 sm:p-4">
      <div className="mb-3 flex flex-col gap-1">
        <h2 className="text-sm font-black uppercase tracking-normal text-slate-500 dark:text-slate-300">{channel.name}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">{channelSourceNote(channel)}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
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
              <option value="">Padrão do canal</option>
              {channel.fee_rules.categories.map((category) => (
                <option key={category.code} value={category.code}>
                  {category.code === "default" ? "Geral" : category.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <PercentInput
          label="Comissão manual"
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

function channelSourceNote(channel: NormalizedChannel) {
  const notes: Record<string, string> = {
    shopee: "Taxas baseadas em informações públicas. Confira no Seller Center antes de usar.",
    tiktok_shop: "Taxas baseadas em informações públicas. Confira no portal do TikTok Shop antes de usar.",
    mercado_livre_classico: "Taxas variam por categoria e tipo de anúncio. Confira no Mercado Livre antes de usar.",
    mercado_livre_premium: "Taxas variam por categoria e tipo de anúncio. Confira no Mercado Livre antes de usar.",
    amazon: "Taxas variam por categoria e plano. Confira no Seller Central antes de usar.",
    temu: "Taxas podem variar por contrato da conta. Confira antes de usar.",
    shein: "Taxa baseada em informações públicas. Confira no portal do seller antes de usar.",
    manual: "Canal livre para você informar as próprias taxas."
  };
  return notes[channel.code] ?? "Taxas estimadas. Confira as regras do canal antes de usar.";
}

function modeButtonClass(active: boolean) {
  return [
    "h-11 rounded-md border px-4 text-sm font-black transition",
    active
      ? "border-mint bg-mint text-slate-950"
      : "border-slate-200 bg-white text-slate-600 dark:border-line dark:bg-slate-950/30 dark:text-slate-300"
  ].join(" ");
}
