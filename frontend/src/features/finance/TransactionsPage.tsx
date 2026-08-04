import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  PieChart,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { MoneyInput } from "../../components/MoneyInput";
import {
  createTransaction,
  deleteTransaction,
  listCategories,
  listTransactions,
  updateTransaction
} from "../../services/finance";
import type { Period, TransactionPayload } from "../../services/finance";
import type { FinanceCategory, FinanceKind, FinanceTransaction } from "../../types";
import { FinanceIcon } from "../../utils/financeIcons";
import { monthEndISODate, monthStartISODate, readFinancePeriod, writeFinancePeriod } from "../../utils/financePeriod";
import { formatBPS, formatBRL } from "../../utils/money";

type Filter = "all" | FinanceKind;

type Draft = {
  kind: FinanceKind;
  category_id: string;
  amount_cents: number;
  description: string;
};

const emptyDraft: Draft = {
  kind: "expense",
  category_id: "",
  amount_cents: 0,
  description: ""
};

export function TransactionsPage() {
  const [period, setPeriod] = useState<Period>(() => readFinancePeriod());
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceTransaction | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    writeFinancePeriod(period);
  }, [period]);

  useEffect(() => {
    listCategories()
      .then(setCategories)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    listTransactions(period)
      .then((items) => {
        if (active) {
          setTransactions(items);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Falha ao carregar transações");
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

  async function reload() {
    const items = await listTransactions(period);
    setTransactions(items);
  }

  const revenue = transactions
    .filter((item) => item.kind === "income")
    .reduce((total, item) => total + item.amount_cents, 0);
  const expense = transactions
    .filter((item) => item.kind === "expense")
    .reduce((total, item) => total + item.amount_cents, 0);
  const profit = revenue - expense;
  const marginBps = revenue > 0 ? Math.trunc((profit * 10000) / revenue) : 0;

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return transactions.filter((item) => {
      const matchesKind = filter === "all" || item.kind === filter;
      const matchesTerm =
        term === "" ||
        item.category_name.toLowerCase().includes(term) ||
        (item.description ?? "").toLowerCase().includes(term);
      return matchesKind && matchesTerm;
    });
  }, [transactions, filter, search]);

  const availableCategories = categories.filter(
    (category) => category.kind === draft.kind && category.active
  );

  function openCreate() {
    setDraft(emptyDraft);
    setEditing(null);
    setModalOpen(true);
    setError(null);
  }

  function openEdit(transaction: FinanceTransaction) {
    setDraft({
      kind: transaction.kind,
      category_id: transaction.category_id,
      amount_cents: transaction.amount_cents,
      description: transaction.description ?? ""
    });
    setEditing(transaction);
    setModalOpen(true);
    setError(null);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function changeKind(kind: FinanceKind) {
    // The category list is filtered by kind, so a category picked for the other
    // kind must be dropped instead of silently staying selected.
    setDraft((current) => ({ ...current, kind, category_id: "" }));
  }

  async function save() {
    if (!draft.category_id) {
      setError("Selecione uma categoria.");
      return;
    }
    if (draft.amount_cents <= 0) {
      setError("Informe um valor maior que zero.");
      return;
    }

    const payload: TransactionPayload = {
      category_id: draft.category_id,
      amount_cents: draft.amount_cents,
      description: draft.description.trim() || null,
      period_start: period.start,
      period_end: period.end
    };

    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await updateTransaction(editing.id, payload);
      } else {
        await createTransaction(payload);
      }
      await reload();
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar transação");
    } finally {
      setSaving(false);
    }
  }

  async function remove(transaction: FinanceTransaction) {
    setError(null);
    try {
      await deleteTransaction(transaction.id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao excluir transação");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-display text-[34px] leading-none sm:text-[40px]">Transações</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Lance os totais de receitas e despesas do período. Esses valores alimentam o Dashboard.
          </p>
        </div>
        <div className="no-print flex flex-wrap items-center gap-2">
          <PeriodPicker period={period} onChange={setPeriod} />
          <button type="button" className="btn-primary shrink-0" onClick={openCreate}>
            <Plus size={16} />
            Nova transação
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Receitas totais"
          value={formatBRL(revenue)}
          icon={<ArrowUpRight size={18} />}
          tone="text-emerald-500"
        />
        <MetricCard
          label="Despesas totais"
          value={formatBRL(expense)}
          icon={<ArrowDownRight size={18} />}
          tone="text-ember"
        />
        <MetricCard
          label="Lucro líquido"
          value={formatBRL(profit)}
          icon={<Wallet size={18} />}
          tone={profit >= 0 ? "text-violet-500" : "text-orange-500"}
        />
        <MetricCard
          label="Margem de lucro"
          value={formatBPS(marginBps)}
          icon={<PieChart size={18} />}
          tone={profit >= 0 ? "text-amber-500" : "text-orange-500"}
        />
      </div>

      {error ? <p className="text-sm font-bold text-orange-500">{error}</p> : null}

      <div className="glass-card overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-line">
          <div className="flex gap-1.5">
            <FilterTab active={filter === "all"} onClick={() => setFilter("all")}>
              Todas
            </FilterTab>
            <FilterTab active={filter === "income"} onClick={() => setFilter("income")}>
              Receitas
            </FilterTab>
            <FilterTab active={filter === "expense"} onClick={() => setFilter("expense")}>
              Despesas
            </FilterTab>
          </div>
          <div className="relative sm:w-64">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input-base pl-9"
              aria-label="Buscar transação"
              placeholder="Buscar categoria..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-line">
                <th className="section-title px-4 py-2">Categoria</th>
                <th className="section-title px-4 py-2">Tipo</th>
                <th className="section-title px-4 py-2">Valor</th>
                <th className="section-title px-4 py-2">% do faturamento</th>
                <th className="section-title px-4 py-2">Descrição</th>
                <th className="w-20 px-4 py-2" aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {visible.map((transaction) => (
                <tr
                  key={transaction.id}
                  className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50 dark:border-line dark:hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-1.5">
                    <span className="flex items-center gap-2 font-semibold">
                      <span
                        className={[
                          "grid h-7 w-7 shrink-0 place-items-center rounded-full",
                          transaction.kind === "income"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-ember/10 text-ember"
                        ].join(" ")}
                      >
                        <FinanceIcon name={transaction.category_icon} size={15} />
                      </span>
                      {transaction.category_name}
                    </span>
                  </td>
                  <td className="px-4 py-1.5">
                    <KindBadge kind={transaction.kind} />
                  </td>
                  <td
                    className={[
                      "text-figure whitespace-nowrap px-4 py-1.5 font-bold",
                      transaction.kind === "income" ? "text-emerald-500" : "text-ember"
                    ].join(" ")}
                  >
                    {formatBRL(transaction.amount_cents)}
                  </td>
                  <td className="text-figure whitespace-nowrap px-4 py-1.5 text-slate-500 dark:text-slate-400">
                    {revenue > 0 ? formatBPS(Math.trunc((transaction.amount_cents * 10000) / revenue)) : "—"}
                  </td>
                  <td className="max-w-[260px] truncate px-4 py-1.5 text-slate-500 dark:text-slate-400">
                    {transaction.description ?? "—"}
                  </td>
                  <td className="px-4 py-1.5 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        className="icon-btn h-8 w-8"
                        title="Editar"
                        onClick={() => openEdit(transaction)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn h-8 w-8"
                        title="Excluir"
                        onClick={() => remove(transaction)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading ? (
          <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">Carregando...</div>
        ) : null}
        {!loading && visible.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            {transactions.length === 0
              ? "Nenhuma transação lançada nesse período."
              : "Nenhuma transação encontrada para esse filtro."}
          </div>
        ) : null}

        {visible.length > 0 ? (
          <div className="flex flex-wrap justify-between gap-3 border-t border-slate-200 px-4 py-2.5 text-sm dark:border-line">
            <span className="text-slate-500 dark:text-slate-400">
              Total de lançamentos: <strong className="text-figure text-ember">{visible.length}</strong>
            </span>
            <span className="flex flex-wrap gap-4">
              <span className="text-slate-500 dark:text-slate-400">
                Receitas: <strong className="text-figure text-emerald-500">{formatBRL(revenue)}</strong>
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                Despesas: <strong className="text-figure text-ember">{formatBRL(expense)}</strong>
              </span>
            </span>
          </div>
        ) : null}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 px-4 py-8 backdrop-blur-md">
          <div className="glass-card w-full max-w-lg p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-base font-black">{editing ? "Editar transação" : "Nova transação"}</h2>
              <button type="button" className="icon-btn" title="Fechar" onClick={closeModal}>
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <KindOption selected={draft.kind === "income"} onClick={() => changeKind("income")} tone="income">
                  <TrendingUp size={16} />
                  Receita
                </KindOption>
                <KindOption selected={draft.kind === "expense"} onClick={() => changeKind("expense")} tone="expense">
                  <TrendingDown size={16} />
                  Despesa
                </KindOption>
              </div>

              <MoneyInput
                label="Valor"
                value={draft.amount_cents}
                onChange={(amount_cents) => setDraft({ ...draft, amount_cents })}
              />

              <label className="block space-y-1.5">
                <span className="field-label">Categoria</span>
                <select
                  className="input-base"
                  aria-label="Categoria"
                  value={draft.category_id}
                  onChange={(event) => setDraft({ ...draft, category_id: event.target.value })}
                >
                  <option value="">
                    {availableCategories.length === 0
                      ? "Nenhuma categoria desse tipo"
                      : "Selecione uma categoria"}
                  </option>
                  {availableCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="field-label">Descrição (opcional)</span>
                <input
                  className="input-base"
                  aria-label="Descrição"
                  value={draft.description}
                  maxLength={180}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                />
              </label>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Período do lançamento: {period.start.split("-").reverse().join("/")} até{" "}
                {period.end.split("-").reverse().join("/")}
              </p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={closeModal}>
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={save} disabled={saving}>
                <Save size={16} />
                Salvar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PeriodPicker({ period, onChange }: { period: Period; onChange: (period: Period) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    try {
      inputRef.current?.showPicker();
    } catch {
      // showPicker() needs browser support and a direct user gesture; falling
      // back to focus still lets the user open it via keyboard/native icon.
      inputRef.current?.focus();
    }
  }

  return (
    <div
      className="flex h-9 cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 dark:border-line dark:bg-black/20"
      onClick={(event) => {
        if (event.target !== inputRef.current) {
          openPicker();
        }
      }}
    >
      <CalendarDays size={16} className="shrink-0 text-slate-400" />
      <input
        ref={inputRef}
        type="month"
        className="h-full w-[124px] cursor-pointer border-0 bg-transparent p-0 text-sm text-slate-900 outline-none dark:text-slate-100"
        aria-label="Período (mês)"
        value={period.start.slice(0, 7)}
        onChange={(event) => {
          if (!event.target.value) return;
          const yearMonth = event.target.value;
          onChange({ start: monthStartISODate(yearMonth), end: monthEndISODate(yearMonth) });
        }}
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  tone
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <section className="glass-card flex items-center gap-3 p-4">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-900/[0.04] dark:bg-white/[0.06] ${tone}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <p className={`text-figure text-xl font-bold ${tone}`}>{value}</p>
      </div>
    </section>
  );
}

function KindBadge({ kind }: { kind: FinanceKind }) {
  return (
    <span
      className={[
        "rounded-full px-2 py-0.5 text-xs font-bold",
        kind === "income" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-ember/10 text-ember"
      ].join(" ")}
    >
      {kind === "income" ? "Receita" : "Despesa"}
    </span>
  );
}

function FilterTab({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "h-9 rounded-full px-3.5 text-sm font-semibold transition duration-150 ease-snap",
        active
          ? "bg-ember/10 text-ember dark:bg-ember/15 dark:text-orange-200"
          : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function KindOption({
  selected,
  onClick,
  tone,
  children
}: {
  selected: boolean;
  onClick: () => void;
  tone: FinanceKind;
  children: React.ReactNode;
}) {
  const selectedClass =
    tone === "income"
      ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : "border-ember bg-ember/10 text-ember";
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex h-11 items-center justify-center gap-2 rounded-full border text-sm font-bold transition duration-150 ease-snap",
        selected
          ? selectedClass
          : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-line dark:text-slate-400"
      ].join(" ")}
    >
      {children}
    </button>
  );
}
