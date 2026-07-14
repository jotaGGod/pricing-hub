import { Copy, Eraser, FileDown, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ChannelSelector } from "../../components/ChannelSelector";
import { CostsPercentTable } from "../../components/CostsPercentTable";
import { MoneyInput } from "../../components/MoneyInput";
import { PercentInput } from "../../components/PercentInput";
import { ProductCard } from "../../components/ProductCard";
import { ResultsPanel } from "../../components/ResultsPanel";
import { listChannels } from "../../services/channels";
import { createProduct } from "../../services/products";
import { calculatePricing } from "../../services/pricing";
import { createSimulation } from "../../services/simulations";
import type { NormalizedChannel, PricingInput, PricingResult } from "../../types";
import { pricingFormSchema } from "../../utils/validation";

const initialPricingInput: PricingInput = {
  product_title: "",
  product_cost_cents: 0,
  sale_price_cents: 0,
  desired_margin_bps: null,
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
  mode: "analyze_sale_price"
};

const pricingDraftStorageKey = "pricing-hub:pricing-draft:v1";

function createInitialPricingInput(): PricingInput {
  return {
    ...initialPricingInput,
    channel_options: {
      ...initialPricingInput.channel_options,
      enabled_options: {}
    },
    logistic_cost: {
      ...initialPricingInput.logistic_cost
    },
    manual_costs: []
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readPricingDraft(): PricingInput {
  if (typeof window === "undefined") {
    return createInitialPricingInput();
  }

  try {
    const rawDraft = window.localStorage.getItem(pricingDraftStorageKey);
    if (!rawDraft) {
      return createInitialPricingInput();
    }

    const parsedDraft: unknown = JSON.parse(rawDraft);
    if (!isRecord(parsedDraft)) {
      return createInitialPricingInput();
    }

    const channelOptions = isRecord(parsedDraft.channel_options) ? parsedDraft.channel_options : {};
    const logisticCost = isRecord(parsedDraft.logistic_cost) ? parsedDraft.logistic_cost : {};
    const salePriceCents = typeof parsedDraft.sale_price_cents === "number" ? parsedDraft.sale_price_cents : 0;
    const draft = {
      ...initialPricingInput,
      ...parsedDraft,
      sale_price_cents: salePriceCents,
      desired_margin_bps: null,
      mode: "analyze_sale_price",
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
    const parsed = pricingFormSchema.safeParse({
      ...draft,
      desired_margin_bps: 0,
      mode: "target_margin"
    });
    return parsed.success
      ? {
          ...parsed.data,
          sale_price_cents: parsed.data.sale_price_cents ?? 0,
          desired_margin_bps: null,
          logistic_cost: {
            ...parsed.data.logistic_cost,
            type: "fixed_amount",
            bps: 0
          },
          mode: "analyze_sale_price"
        }
      : createInitialPricingInput();
  } catch {
    return createInitialPricingInput();
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

    if (!form.sale_price_cents || form.sale_price_cents <= 0) {
      setResult(null);
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

  function clearPricingForm() {
    window.localStorage.removeItem(pricingDraftStorageKey);
    setForm(createInitialPricingInput());
    setResult(zeroPricingResult());
    setError(null);
    setNotice(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-normal sm:text-[32px]">Precificador</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Cálculo para precificação de produtos</p>
        </div>
        <div className="no-print grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
          <button type="button" className="btn-secondary" onClick={() => window.print()}>
            <span className="button-icon">
              <FileDown size={15} />
            </span>
            Salvar PDF
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setForm({ ...form, product_title: `${form.product_title || "Produto"} cópia` })}
          >
            <span className="button-icon">
              <Copy size={15} />
            </span>
            Duplicar
          </button>
          <button type="button" className="btn-secondary" onClick={clearPricingForm}>
            <span className="button-icon">
              <Eraser size={15} />
            </span>
            Limpar campos
          </button>
          <button type="button" className="btn-primary" onClick={saveSimulation} disabled={savingSimulation}>
            <span className="button-icon">
              <Save size={15} />
            </span>
            Salvar
          </button>
        </div>
      </div>

      <section className="glass-card px-3 py-2.5">
        <div className="min-w-0 space-y-2">
          <span className="section-title block">Canal</span>
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
        <div className="rounded-[10px] border border-mint/30 bg-mint/10 px-3 py-2.5 text-sm font-semibold text-emerald-700 dark:text-mint">
          {notice}
        </div>
      ) : null}

      <div className="grid items-start gap-3 xl:grid-cols-[minmax(260px,0.86fr)_minmax(350px,1.12fr)_minmax(280px,0.94fr)]">
        <div className="space-y-3">
          <ProductCard value={form} onChange={setForm} onSave={saveProduct} saving={savingProduct} />
          <ChannelOptionsPanel channel={selectedChannel} value={form} onChange={setForm} />
        </div>

        <div className="space-y-3">
          <CostsPercentTable value={form} onChange={setForm} />
        </div>

        <div className="space-y-3 xl:sticky xl:top-[68px]">
          <ResultsPanel result={result} loading={loading} error={error} />
        </div>
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
    <section className="glass-card p-3">
      <div className="mb-2.5 flex flex-col gap-1">
        <h2 className="section-title">{channel.name}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">{channelSourceNote(channel)}</p>
      </div>
      <div className="grid gap-2.5 md:grid-cols-2">
        {channel.fee_rules.categories.length > 0 ? (
          <label className="block space-y-1.5 md:col-span-2">
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
            className="flex min-h-10 items-center justify-between gap-3 rounded-[10px] border border-slate-200/80 px-3 py-2 text-sm font-semibold dark:border-line"
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
