import { Save, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CostsPercentTable } from "../../components/CostsPercentTable";
import { getPreferences, updateDefaultCosts } from "../../services/preferences";
import type { DefaultCosts } from "../../types";
import { mergeIntoPricingDraft } from "../../utils/pricingDraft";

const emptyDefaultCosts: DefaultCosts = {
  tax_bps: 0,
  ads_bps: 0,
  fixed_costs_bps: 0,
  extra_fees_bps: 0,
  seller_discount_bps: 0,
  logistic_cost: { type: "fixed_amount", amount_cents: 0, bps: 0 },
  manual_costs: []
};

export function TaxesPage() {
  const navigate = useNavigate();
  const [costs, setCosts] = useState<DefaultCosts>(emptyDefaultCosts);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPreferences()
      .then((preference) => setCosts(preference.default_costs))
      .catch((err) => setError(err instanceof Error ? err.message : "Falha ao carregar o modelo salvo"))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      const preference = await updateDefaultCosts(costs);
      setCosts(preference.default_costs);
      setNotice("Modelo salvo.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar o modelo");
    } finally {
      setSaving(false);
    }
  }

  function applyToPricing() {
    mergeIntoPricingDraft(costs);
    navigate("/pricing");
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-display text-[34px] leading-none sm:text-[40px]">Taxas e Custos</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Defina um modelo padrão de impostos, ads, custos fixos e taxas extras. Esses valores entram
          pré-preenchidos ao iniciar uma nova precificação, mas continuam livres para alterar manualmente na tela do
          Precificador a qualquer momento.
        </p>
      </div>

      {notice ? (
        <div className="rounded-2xl border border-mint/30 bg-mint/10 px-3 py-2.5 text-sm font-semibold text-emerald-700 dark:text-mint">
          {notice}
        </div>
      ) : null}
      {error ? <p className="text-sm font-bold text-orange-500">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Carregando...</p>
      ) : (
        <>
          <CostsPercentTable value={costs} onChange={setCosts} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={save} disabled={saving}>
              <Save size={17} />
              Salvar modelo
            </button>
            <button type="button" className="btn-secondary" onClick={applyToPricing}>
              <Send size={16} />
              Aplicar no Precificador
            </button>
          </div>
        </>
      )}
    </div>
  );
}
