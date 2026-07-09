import { AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import type { PricingResult } from "../types";
import { formatBPS, formatBRL } from "../utils/money";

type ResultsPanelProps = {
  result: PricingResult | null;
  loading: boolean;
  error: string | null;
};

export function ResultsPanel({ result, loading, error }: ResultsPanelProps) {
  const statusClass =
    result?.status === "loss"
      ? "text-orange-500"
      : result?.status === "warning"
        ? "text-amber-500"
        : "text-emerald-500";
  const StatusIcon = result?.status === "loss" ? AlertTriangle : result?.status === "warning" ? TrendingUp : CheckCircle2;

  return (
    <section className="glass-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-black">Resultados</h2>
        {loading ? <span className="text-xs font-bold text-slate-400">calculando...</span> : null}
      </div>
      {error ? (
        <div className="rounded-md border border-orange-300 bg-orange-50 p-4 text-sm font-semibold text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300">
          {error}
        </div>
      ) : null}
      {!result && !error ? (
        <div className="rounded-md border border-dashed border-slate-300 p-5 text-sm text-slate-500 dark:border-line dark:text-slate-400">
          Preencha os valores para calcular.
        </div>
      ) : null}
      {result ? (
        <div className="space-y-5">
          <div className="rounded-lg bg-slate-950 p-5 text-white dark:bg-black/30">
            <div className="mb-2 flex items-center gap-2">
              <StatusIcon size={20} className={statusClass} />
              <span className="text-sm font-bold text-slate-300">Preco recomendado</span>
            </div>
            <p className="text-4xl font-black text-mint">{formatBRL(result.recommended_sale_price_cents)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Lucro liquido" value={formatBRL(result.net_profit_cents)} tone={statusClass} />
            <Metric label="Margem real" value={formatBPS(result.margin_bps)} />
            <Metric label="Custo total" value={formatBRL(result.total_cost_cents)} />
            <Metric label="Markup" value={formatBPS(result.markup_bps)} />
          </div>
          <div className="max-h-80 overflow-auto rounded-md border border-slate-200 dark:border-line">
            {result.breakdown.map((item) => (
              <div
                key={`${item.label}-${item.amount_cents}-${item.bps ?? 0}`}
                className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-sm last:border-b-0 dark:border-line"
              >
                <span className="text-slate-500 dark:text-slate-300">
                  {item.label}
                  {item.bps ? <span className="ml-2 text-xs text-slate-400">{formatBPS(item.bps)}</span> : null}
                </span>
                <strong>{formatBRL(item.amount_cents)}</strong>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Metric({ label, value, tone = "" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md border border-slate-200 p-3 dark:border-line">
      <p className="text-xs font-bold uppercase tracking-normal text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-black ${tone}`}>{value}</p>
    </div>
  );
}
