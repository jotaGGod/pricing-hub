import { DollarSign, Percent, PieChart, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { getSummary } from "../../services/finance";
import type { Period } from "../../services/finance";
import type { FinanceSummary, FinanceSummaryLine } from "../../types";
import { FinanceIcon } from "../../utils/financeIcons";
import { readFinancePeriod, writeFinancePeriod } from "../../utils/financePeriod";
import { formatBPS, formatBRL } from "../../utils/money";
import { PeriodPicker } from "./TransactionsPage";

// Fixed palette so a category keeps the same colour between the donut and its
// legend, regardless of how the lines are ordered.
const sliceColors = [
  "#3b82f6",
  "#f97316",
  "#22c55e",
  "#8b5cf6",
  "#06b6d4",
  "#eab308",
  "#ec4899",
  "#94a3b8"
];

export function DashboardPage() {
  const [period, setPeriod] = useState<Period>(() => readFinancePeriod());
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    writeFinancePeriod(period);
  }, [period]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getSummary(period)
      .then((nextSummary) => {
        if (active) {
          setSummary(nextSummary);
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
          <h1 className="text-3xl font-black">Dashboard de Lucratividade</h1>
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
            <CostCompositionCard lines={summary.expense_lines} total={summary.expense_cents} revenue={summary.revenue_cents} />
            <div className="grid grid-cols-2 gap-3">
              <KpiCard
                label="Faturamento Total"
                value={formatBRL(summary.revenue_cents)}
                changeBps={summary.revenue_change_bps}
                icon={<DollarSign size={18} />}
                tone="text-blue-500"
              />
              <KpiCard
                label="Lucro Real"
                value={formatBRL(summary.net_profit_cents)}
                changeBps={summary.net_profit_change_bps}
                icon={<TrendingUp size={18} />}
                tone={summary.net_profit_cents >= 0 ? "text-emerald-500" : "text-orange-500"}
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
                label="Despesas Totais"
                value={formatBRL(summary.expense_cents)}
                changeBps={summary.expense_change_bps}
                invertChangeTone
                icon={<PieChart size={18} />}
                tone="text-ember"
              />
            </div>
          </div>

          <DreTable summary={summary} />
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
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-slate-900/[0.04] dark:bg-white/[0.06] ${tone}`}>
          {icon}
        </span>
      </div>
      <p className={`mt-1 text-2xl font-black ${tone}`}>{value}</p>
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
        "mt-1 text-xs font-semibold",
        good ? "text-emerald-500" : "text-orange-500"
      ].join(" ")}
    >
      {positive ? "↑" : "↓"} {formatBPS(Math.abs(changeBps))}
      {asPoints ? " p.p." : ""}{" "}
      <span className="font-normal text-slate-400">vs período anterior</span>
    </p>
  );
}

function CostCompositionCard({
  lines,
  total,
  revenue
}: {
  lines: FinanceSummaryLine[];
  total: number;
  revenue: number;
}) {
  return (
    <section className="glass-card p-4">
      <h2 className="section-title mb-3">Composição de Custos e Despesas</h2>
      {total === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Nenhuma despesa lançada nesse período.
        </p>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <Donut lines={lines} total={total} revenue={revenue} />
          <ul className="max-h-[176px] w-full space-y-1.5 overflow-y-auto pr-1">
            {lines.map((line, index) => (
              <li key={line.category_id} className="flex items-center gap-2 text-sm">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: sliceColors[index % sliceColors.length] }}
                />
                <span className="min-w-0 flex-1 truncate font-semibold" title={line.category_name}>
                  {line.category_name}
                </span>
                <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                  {formatBRL(line.amount_cents)} ({formatBPS(shareOf(line.amount_cents, total))})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Donut({ lines, total, revenue }: { lines: FinanceSummaryLine[]; total: number; revenue: number }) {
  const size = 200;
  const center = size / 2;
  const radius = 72;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative shrink-0">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Composição de custos">
        <g transform={`rotate(-90 ${center} ${center})`}>
          {lines.map((line, index) => {
            const fraction = total > 0 ? line.amount_cents / total : 0;
            const dash = fraction * circumference;
            const circle = (
              <circle
                key={line.category_id}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={sliceColors[index % sliceColors.length]}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
              >
                <title>
                  {`${line.category_name}: ${formatBRL(line.amount_cents)} (${formatBPS(shareOf(line.amount_cents, total))})`}
                </title>
              </circle>
            );
            offset += dash;
            return circle;
          })}
        </g>
      </svg>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div className="mx-auto max-w-[112px] leading-tight">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total</p>
          <p className="text-lg font-black">{formatBRL(total)}</p>
          {revenue > 0 ? (
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              {formatBPS(shareOf(total, revenue))} do faturamento
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DreTable({ summary }: { summary: FinanceSummary }) {
  return (
    <section className="glass-card overflow-hidden">
      <div className="border-b border-slate-200 p-3 dark:border-line">
        <h2 className="text-base font-black">DRE — Demonstração do Resultado do Exercício</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-line">
              <th className="section-title px-4 py-2">Descrição</th>
              <th className="section-title px-4 py-2 text-right">Valor (R$)</th>
              <th className="section-title px-4 py-2 text-right">% sobre faturamento</th>
              <th className="section-title px-4 py-2 text-right">Variação</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100 dark:border-line">
              <td className="px-4 py-2 font-black text-emerald-600 dark:text-emerald-400">
                FATURAMENTO BRUTO
                <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
                  Receita total do período
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                {formatBRL(summary.revenue_cents)}
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-right">{summary.revenue_cents > 0 ? "100,00%" : "—"}</td>
              <td className="whitespace-nowrap px-4 py-2 text-right">
                <InlineChange changeBps={summary.revenue_change_bps} />
              </td>
            </tr>

            {summary.income_lines.length > 1 ? (
              <>
                <SectionRow label="(+) COMPOSIÇÃO DAS RECEITAS" />
                {summary.income_lines.map((line) => (
                  <LineRow key={line.category_id} line={line} tone="text-emerald-600 dark:text-emerald-400" />
                ))}
              </>
            ) : null}

            <SectionRow label="(-) DEDUÇÕES E CUSTOS" />
            {summary.expense_lines.map((line) => (
              <LineRow key={line.category_id} line={line} tone="text-ember" invertChangeTone />
            ))}
            {summary.expense_lines.length === 0 ? (
              <tr className="border-b border-slate-100 dark:border-line">
                <td colSpan={4} className="px-4 py-3 text-center text-sm text-slate-500 dark:text-slate-400">
                  Nenhuma despesa lançada nesse período.
                </td>
              </tr>
            ) : null}
            <tr className="border-b border-slate-100 dark:border-line">
              <td className="px-4 py-2 font-bold">Total de despesas</td>
              <td className="whitespace-nowrap px-4 py-2 text-right font-bold text-ember">
                {formatBRL(summary.expense_cents)}
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-right">
                {formatBPS(summary.expense_share_of_revenue_bps)}
              </td>
              <td className="whitespace-nowrap px-4 py-2 text-right">
                <InlineChange changeBps={summary.expense_change_bps} invertTone />
              </td>
            </tr>

            <tr className="bg-emerald-500/[0.07]">
              <td className="px-4 py-3 font-black text-emerald-700 dark:text-emerald-400">
                (=) LUCRO REAL
                <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
                  Resultado líquido após todos os custos e despesas
                </span>
              </td>
              <td
                className={[
                  "whitespace-nowrap px-4 py-3 text-right text-base font-black",
                  summary.net_profit_cents >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-orange-500"
                ].join(" ")}
              >
                {formatBRL(summary.net_profit_cents)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-bold">{formatBPS(summary.margin_bps)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <InlineChange changeBps={summary.net_profit_change_bps} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SectionRow({ label }: { label: string }) {
  return (
    <tr className="border-b border-slate-100 bg-slate-500/[0.05] dark:border-line">
      <td colSpan={4} className="px-4 py-1.5 text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </td>
    </tr>
  );
}

function LineRow({
  line,
  tone,
  invertChangeTone = false
}: {
  line: FinanceSummaryLine;
  tone: string;
  invertChangeTone?: boolean;
}) {
  return (
    <tr className="border-b border-slate-100 last:border-b-0 dark:border-line">
      <td className="px-4 py-1.5">
        <span className="flex items-center gap-2">
          <span className="text-slate-400">
            <FinanceIcon name={line.category_icon} size={15} />
          </span>
          {line.category_name}
        </span>
      </td>
      <td className={`whitespace-nowrap px-4 py-1.5 text-right font-semibold ${tone}`}>
        {formatBRL(line.amount_cents)}
      </td>
      <td className="whitespace-nowrap px-4 py-1.5 text-right text-slate-500 dark:text-slate-400">
        {formatBPS(line.share_of_revenue_bps)}
      </td>
      <td className="whitespace-nowrap px-4 py-1.5 text-right">
        <InlineChange changeBps={line.change_bps} invertTone={invertChangeTone} />
      </td>
    </tr>
  );
}

function InlineChange({ changeBps, invertTone = false }: { changeBps: number | null; invertTone?: boolean }) {
  if (changeBps === null) {
    return <span className="text-slate-400">—</span>;
  }
  const positive = changeBps >= 0;
  const good = invertTone ? !positive : positive;
  return (
    <span className={good ? "font-semibold text-emerald-500" : "font-semibold text-orange-500"}>
      {positive ? "↑" : "↓"} {formatBPS(Math.abs(changeBps))}
    </span>
  );
}

function shareOf(part: number, whole: number): number {
  if (whole <= 0) {
    return 0;
  }
  return Math.trunc((part * 10000) / whole);
}
