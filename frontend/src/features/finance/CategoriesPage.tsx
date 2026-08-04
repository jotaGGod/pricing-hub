import { Package, Pencil, Plus, Save, Search, Trash2, TrendingDown, TrendingUp, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory
} from "../../services/finance";
import type { CategoryPayload } from "../../services/finance";
import type { FinanceCategory, FinanceKind } from "../../types";
import { FinanceIcon, financeIconNames } from "../../utils/financeIcons";

type Filter = "all" | FinanceKind;

const emptyDraft: CategoryPayload = {
  name: "",
  kind: "expense",
  icon: "circle-dollar-sign",
  description: null,
  active: true
};

export function CategoriesPage() {
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<FinanceCategory | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<CategoryPayload>(emptyDraft);
  const [saving, setSaving] = useState(false);

  function reload() {
    return listCategories()
      .then((items) => {
        setCategories(items);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Falha ao carregar categorias"));
  }

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  const incomeCount = categories.filter((category) => category.kind === "income").length;
  const expenseCount = categories.filter((category) => category.kind === "expense").length;

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return categories.filter((category) => {
      const matchesKind = filter === "all" || category.kind === filter;
      const matchesTerm = term === "" || category.name.toLowerCase().includes(term);
      return matchesKind && matchesTerm;
    });
  }, [categories, filter, search]);

  function openCreate() {
    setDraft(emptyDraft);
    setEditing(null);
    setCreating(true);
    setError(null);
  }

  function openEdit(category: FinanceCategory) {
    setDraft({
      name: category.name,
      kind: category.kind,
      icon: category.icon,
      description: category.description,
      active: category.active
    });
    setEditing(category);
    setCreating(false);
    setError(null);
  }

  function closeModal() {
    setEditing(null);
    setCreating(false);
  }

  async function save() {
    if (!draft.name.trim()) {
      setError("Informe o nome da categoria.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await updateCategory(editing.id, draft);
      } else {
        await createCategory(draft);
      }
      await reload();
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar categoria");
    } finally {
      setSaving(false);
    }
  }

  async function remove(category: FinanceCategory) {
    setError(null);
    try {
      await deleteCategory(category.id);
      await reload();
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes("existe")
          ? `"${category.name}" tem transações lançadas e não pode ser excluída.`
          : err instanceof Error
            ? err.message
            : "Falha ao excluir categoria"
      );
    }
  }

  const modalOpen = creating || editing !== null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-display text-[34px] leading-none sm:text-[40px]">Categorias</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Cadastre e gerencie as categorias de receitas e despesas usadas nas suas transações.
          </p>
        </div>
        <button type="button" className="btn-primary shrink-0" onClick={openCreate}>
          <Plus size={16} />
          Nova categoria
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Total de Receitas"
          value={incomeCount}
          hint="Categorias ativas"
          icon={<TrendingUp size={18} />}
          tone="text-emerald-500"
        />
        <SummaryCard
          label="Total de Despesas"
          value={expenseCount}
          hint="Categorias ativas"
          icon={<TrendingDown size={18} />}
          tone="text-ember"
        />
        <SummaryCard
          label="Total de Categorias"
          value={categories.length}
          hint="Categorias cadastradas"
          icon={<Package size={18} />}
          tone="text-violet-500"
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
              aria-label="Buscar categoria"
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
                <th className="section-title px-4 py-2">Descrição</th>
                <th className="section-title px-4 py-2">Status</th>
                <th className="w-20 px-4 py-2" aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {visible.map((category) => (
                <tr
                  key={category.id}
                  className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50 dark:border-line dark:hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-1.5">
                    <span className="flex items-center gap-2 font-semibold">
                      <span
                        className={[
                          "grid h-7 w-7 shrink-0 place-items-center rounded-full",
                          category.kind === "income"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-ember/10 text-ember"
                        ].join(" ")}
                      >
                        <FinanceIcon name={category.icon} size={15} />
                      </span>
                      {category.name}
                    </span>
                  </td>
                  <td className="px-4 py-1.5">
                    <KindBadge kind={category.kind} />
                  </td>
                  <td className="max-w-[280px] truncate px-4 py-1.5 text-slate-500 dark:text-slate-400">
                    {category.description ?? "—"}
                  </td>
                  <td className="px-4 py-1.5">
                    <span
                      className={[
                        "rounded-full px-2 py-0.5 text-xs font-bold",
                        category.active
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-slate-400/15 text-slate-500 dark:text-slate-400"
                      ].join(" ")}
                    >
                      {category.active ? "Ativa" : "Inativa"}
                    </span>
                  </td>
                  <td className="px-4 py-1.5 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        className="icon-btn h-8 w-8"
                        title="Editar"
                        onClick={() => openEdit(category)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn h-8 w-8"
                        title="Excluir"
                        onClick={() => remove(category)}
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
            {categories.length === 0
              ? "Nenhuma categoria cadastrada ainda."
              : "Nenhuma categoria encontrada para esse filtro."}
          </div>
        ) : null}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 px-4 py-8 backdrop-blur-md">
          <div className="glass-card w-full max-w-lg p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-base font-black">{editing ? "Editar categoria" : "Nova categoria"}</h2>
              <button type="button" className="icon-btn" title="Fechar" onClick={closeModal}>
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <KindOption
                  selected={draft.kind === "income"}
                  onClick={() => setDraft({ ...draft, kind: "income" })}
                  tone="income"
                >
                  <TrendingUp size={16} />
                  Receita
                </KindOption>
                <KindOption
                  selected={draft.kind === "expense"}
                  onClick={() => setDraft({ ...draft, kind: "expense" })}
                  tone="expense"
                >
                  <TrendingDown size={16} />
                  Despesa
                </KindOption>
              </div>

              <label className="block space-y-1.5">
                <span className="field-label">Nome</span>
                <input
                  className="input-base"
                  aria-label="Nome"
                  value={draft.name}
                  maxLength={80}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                />
              </label>

              <label className="block space-y-1.5">
                <span className="field-label">Descrição (opcional)</span>
                <input
                  className="input-base"
                  aria-label="Descrição"
                  value={draft.description ?? ""}
                  maxLength={180}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                />
              </label>

              <div className="space-y-1.5">
                <span className="field-label">Ícone</span>
                <div className="grid max-h-40 grid-cols-8 gap-1.5 overflow-y-auto rounded-2xl border border-slate-200 p-2 dark:border-line">
                  {financeIconNames.map((name) => (
                    <button
                      key={name}
                      type="button"
                      title={name}
                      aria-label={`Ícone ${name}`}
                      onClick={() => setDraft({ ...draft, icon: name })}
                      className={[
                        "grid h-9 place-items-center rounded-xl border transition",
                        draft.icon === name
                          ? "border-ember bg-ember text-white"
                          : "border-slate-200 text-slate-500 hover:border-ember/60 hover:text-ember dark:border-line dark:text-slate-300"
                      ].join(" ")}
                    >
                      <FinanceIcon name={name} size={16} />
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-ember"
                  checked={draft.active ?? true}
                  onChange={(event) => setDraft({ ...draft, active: event.target.checked })}
                />
                Categoria ativa
              </label>
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

function SummaryCard({
  label,
  value,
  hint,
  icon,
  tone
}: {
  label: string;
  value: number;
  hint: string;
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
        <p className={`text-figure text-2xl font-bold ${tone}`}>{value}</p>
        <p className="text-xs text-slate-400">{hint}</p>
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
