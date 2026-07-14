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
    <section className="glass-card p-3">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h2 className="section-title">Resultados</h2>
        {loading ? <span className="text-xs font-bold text-slate-400">calculando...</span> : null}
      </div>
      {error ? (
        <div className="rounded-[10px] border border-orange-300 bg-orange-50 p-3 text-sm font-semibold text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300">
          {error}
        </div>
      ) : null}
      {!result && !error ? (
        <div className="rounded-[10px] border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-line dark:text-slate-400">
          Preencha os valores para calcular.
        </div>
      ) : null}
      {result ? (
        <div className="space-y-3">
          <div className="rounded-[12px] border border-slate-900/10 bg-slate-950 p-3.5 text-white shadow-glow dark:border-ember/15 dark:bg-black/30">
            <div className="mb-2 flex items-center gap-2">
              <StatusIcon size={20} className={statusClass} />
              <span className="text-sm font-bold text-slate-300">Preço de venda</span>
            </div>
            <p className="text-3xl font-bold text-mint">{formatBRL(result.sale_price_cents)}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Lucro líquido" value={formatBRL(result.net_profit_cents)} tone={statusClass} />
            <Metric label="Margem real" value={formatBPS(result.margin_bps)} />
            <Metric label="Custo total" value={formatBRL(result.total_cost_cents)} />
            <Metric label="Markup" value={formatBPS(result.markup_bps)} />
          </div>
          <div className="overflow-hidden rounded-[10px] border border-slate-200/80 bg-white/60 dark:border-line dark:bg-black/15">
            <div className="border-b border-slate-100 px-3 py-2 text-[11px] font-bold uppercase tracking-normal text-slate-400 dark:border-line">
              Composição do preço
            </div>
            {result.breakdown.map((item) => (
              <div
                key={`${item.label}-${item.amount_cents}-${item.bps ?? 0}`}
                className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-1.5 text-sm last:border-b-0 dark:border-line"
              >
                <span className="min-w-0 text-slate-500 dark:text-slate-300">
                  {item.label}
                  {item.bps ? <span className="ml-2 text-xs text-slate-400">{formatBPS(item.bps)}</span> : null}
                </span>
                <strong className="shrink-0">{formatBRL(item.amount_cents)}</strong>
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
    <div className="rounded-[10px] border border-slate-200/80 p-2.5 dark:border-line">
      <p className="text-[11px] font-bold uppercase tracking-normal text-slate-400">{label}</p>
      <p className={`mt-1 text-base font-bold sm:text-lg ${tone}`}>{value}</p>
    </div>
  );
}
