import { DollarSign, Percent, PieChart, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { getSeries, getSummary } from "../../services/finance";
import type { Period } from "../../services/finance";
import type { FinanceMonthlyPoint, FinanceSummary } from "../../types";
import { readFinancePeriod, writeFinancePeriod } from "../../utils/financePeriod";
import { formatBPS, formatBRL } from "../../utils/money";
import { PeriodPicker } from "./TransactionsPage";

export function DashboardPage() {
  const [period, setPeriod] = useState<Period>(() => readFinancePeriod());
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [series, setSeries] = useState<FinanceMonthlyPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    writeFinancePeriod(period);
  }, [period]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([getSummary(period), getSeries(period)])
      .then(([nextSummary, nextSeries]) => {
        if (active) {
          setSummary(nextSummary);
          setSeries(nextSeries);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Falha ao carregar o dashboard");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [period]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-display text-[34px] leading-none sm:text-[40px]">Dashboard de Lucratividade</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Análise da sua lucratividade com base nas transações lançadas.
          </p>
        </div>
        <div className="no-print">
          <PeriodPicker period={period} onChange={setPeriod} />
        </div>
      </div>

      {error ? <p className="text-sm font-bold text-orange-500">{error}</p> : null}
      {loading && !summary ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Carregando...</p>
      ) : null}

      {summary ? (
        <>
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
            <ChartCard title="Faturamento x Despesas por Mês">
              <RevenueExpenseChart points={series} />
            </ChartCard>
            <div className="grid grid-cols-2 gap-3">
              <KpiCard
                label="Faturamento Total"
                value={formatBRL(summary.revenue_cents)}
                changeBps={summary.revenue_change_bps}
                icon={<DollarSign size={18} />}
                tone="text-blue-500"
              />
              <KpiCard
                label="Despesas Totais"
                value={formatBRL(summary.expense_cents)}
                changeBps={summary.expense_change_bps}
                invertChangeTone
                icon={<PieChart size={18} />}
                tone="text-ember"
              />
              <KpiCard
                label="Margem de Lucro"
                value={formatBPS(summary.margin_bps)}
                changeBps={summary.margin_change_bps}
                changeAsPoints
                icon={<Percent size={18} />}
                tone={summary.margin_bps >= 0 ? "text-amber-500" : "text-orange-500"}
              />
              <KpiCard
                label="Lucro Real"
                value={formatBRL(summary.net_profit_cents)}
                changeBps={summary.net_profit_change_bps}
                icon={<TrendingUp size={18} />}
                tone={summary.net_profit_cents >= 0 ? "text-emerald-500" : "text-orange-500"}
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function KpiCard({
  label,
  value,
  changeBps,
  icon,
  tone,
  changeAsPoints = false,
  invertChangeTone = false
}: {
  label: string;
  value: string;
  changeBps: number | null;
  icon: React.ReactNode;
  tone: string;
  changeAsPoints?: boolean;
  invertChangeTone?: boolean;
}) {
  return (
    <section className="glass-card p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-900/[0.04] dark:bg-white/[0.06] ${tone}`}>
          {icon}
        </span>
      </div>
      <p className={`text-figure mt-1 text-xl font-bold sm:text-2xl ${tone}`}>{value}</p>
      <ChangeLabel changeBps={changeBps} asPoints={changeAsPoints} invertTone={invertChangeTone} />
    </section>
  );
}

function ChangeLabel({
  changeBps,
  asPoints = false,
  invertTone = false
}: {
  changeBps: number | null;
  asPoints?: boolean;
  invertTone?: boolean;
}) {
  if (changeBps === null) {
    return <p className="mt-1 text-xs text-slate-400">sem período anterior para comparar</p>;
  }
  const positive = changeBps >= 0;
  const good = invertTone ? !positive : positive;
  return (
    <p
      className={[
        "text-figure mt-1 text-xs font-semibold",
        good ? "text-emerald-500" : "text-orange-500"
      ].join(" ")}
    >
      {positive ? "↑" : "↓"} {formatBPS(Math.abs(changeBps))}
      {asPoints ? " p.p." : ""}{" "}
      <span className="font-sans font-normal text-slate-400">vs período anterior</span>
    </p>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass-card p-4">
      <h2 className="section-title mb-3">{title}</h2>
      {children}
    </section>
  );
}

function RevenueExpenseChart({ points }: { points: FinanceMonthlyPoint[] }) {
  if (points.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
        Nenhuma transação lançada nos últimos meses.
      </p>
    );
  }

  const width = 640;
  const height = 220;
  const padding = { top: 8, right: 8, bottom: 26, left: 8 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const baseline = padding.top + innerHeight;

  const max = Math.max(1, ...points.flatMap((point) => [point.revenue_cents, point.expense_cents]));
  const scaleHeight = (value: number) => (value / max) * innerHeight;

  const groupWidth = innerWidth / points.length;
  const barWidth = Math.max(6, Math.min(22, groupWidth * 0.3));
  const barGap = 3;

  return (
    <div>
      {/* Values live in <title> tooltips instead of always-on labels — with up
          to 6 months x 2 bars, printing every number directly on the chart
          turned into unreadable clutter overlapping the bars. */}
      <div className="mb-3 flex items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" />
          Faturamento
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-ember" />
          Despesas
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Faturamento e despesas por mês">
        {points.map((point, index) => {
          const groupX = padding.left + index * groupWidth;
          const center = groupX + groupWidth / 2;
          const revenueHeight = scaleHeight(point.revenue_cents);
          const expenseHeight = scaleHeight(point.expense_cents);
          const label = monthLabel(point.month);
          return (
            <g key={point.month}>
              <rect
                x={center - barWidth - barGap / 2}
                y={baseline - revenueHeight}
                width={barWidth}
                height={revenueHeight}
                rx={3}
                fill="#3b82f6"
              >
                <title>{`${label}: ${formatBRL(point.revenue_cents)} (faturamento)`}</title>
              </rect>
              <rect
                x={center + barGap / 2}
                y={baseline - expenseHeight}
                width={barWidth}
                height={expenseHeight}
                rx={3}
                fill="#fc4c02"
              >
                <title>{`${label}: ${formatBRL(point.expense_cents)} (despesas)`}</title>
              </rect>
              <text
                x={center}
                y={height - 8}
                textAnchor="middle"
                className="fill-slate-400"
                style={{ fontSize: "10px" }}
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function monthLabel(month: string): string {
  const [, monthPart] = month.split("-");
  const index = Number.parseInt(monthPart, 10) - 1;
  return monthNames[index] ?? month;
}
