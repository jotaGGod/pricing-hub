import { useEffect, useState } from "react";
import { getSummary } from "../../services/finance";
import type { Period } from "../../services/finance";
import type { FinanceSummary, FinanceSummaryLine } from "../../types";
import { FinanceIcon } from "../../utils/financeIcons";
import { readFinancePeriod, writeFinancePeriod } from "../../utils/financePeriod";
import { formatBPS, formatBRL } from "../../utils/money";
import { PeriodPicker } from "./TransactionsPage";

export function DrePage() {
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
          setError(err instanceof Error ? err.message : "Falha ao carregar a DRE");
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
          <h1 className="text-display text-[34px] leading-none sm:text-[40px]">DRE</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Demonstração do Resultado do Exercício do período selecionado.
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

      {summary ? <DreTable summary={summary} /> : null}
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
              <td className="text-figure whitespace-nowrap px-4 py-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                {formatBRL(summary.revenue_cents)}
              </td>
              <td className="text-figure whitespace-nowrap px-4 py-2 text-right">{summary.revenue_cents > 0 ? "100,00%" : "—"}</td>
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
              <td className="text-figure whitespace-nowrap px-4 py-2 text-right font-bold text-ember">
                {formatBRL(summary.expense_cents)}
              </td>
              <td className="text-figure whitespace-nowrap px-4 py-2 text-right">
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
                  "text-figure whitespace-nowrap px-4 py-3 text-right text-base font-black",
                  summary.net_profit_cents >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-orange-500"
                ].join(" ")}
              >
                {formatBRL(summary.net_profit_cents)}
              </td>
              <td className="text-figure whitespace-nowrap px-4 py-3 text-right font-bold">{formatBPS(summary.margin_bps)}</td>
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
      <td className={`text-figure whitespace-nowrap px-4 py-1.5 text-right font-semibold ${tone}`}>
        {formatBRL(line.amount_cents)}
      </td>
      <td className="text-figure whitespace-nowrap px-4 py-1.5 text-right text-slate-500 dark:text-slate-400">
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
    <span className={`text-figure ${good ? "font-semibold text-emerald-500" : "font-semibold text-orange-500"}`}>
      {positive ? "↑" : "↓"} {formatBPS(Math.abs(changeBps))}
    </span>
  );
}
