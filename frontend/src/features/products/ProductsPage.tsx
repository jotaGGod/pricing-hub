import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { MoneyInput } from "../../components/MoneyInput";
import { createProduct, deleteProduct, listProducts, productCost, productID, productTitle } from "../../services/products";
import type { Product } from "../../types";
import { formatBRL } from "../../utils/money";

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [title, setTitle] = useState("");
  const [cost, setCost] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    listProducts()
      .then(setProducts)
      .catch((err) => setError(err instanceof Error ? err.message : "Falha ao carregar produtos"));
  }

  useEffect(() => {
    reload();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }
    await createProduct({ title, cost_cents: cost });
    setTitle("");
    setCost(0);
    reload();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-black">Produtos</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">Catálogo salvo</p>
      </div>

      <form className="glass-card grid gap-4 p-5 md:grid-cols-[1fr_220px_auto]" onSubmit={submit}>
        <label className="block space-y-2">
          <span className="field-label">Título</span>
          <input className="input-base" value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <MoneyInput label="Custo do produto" value={cost} onChange={setCost} />
        <button type="submit" className="btn-primary self-end">
          <Plus size={17} />
          Adicionar
        </button>
      </form>

      {error ? <p className="text-sm font-bold text-orange-500">{error}</p> : null}

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-line">
                <th className="section-title px-4 py-2">Nome do produto</th>
                <th className="section-title px-4 py-2">Preço de custo</th>
                <th className="w-12 px-4 py-2" aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr
                  key={productID(product)}
                  className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50 dark:border-line dark:hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-1.5 font-semibold">{productTitle(product)}</td>
                  <td className="px-4 py-1.5 text-slate-500 dark:text-slate-400">{formatBRL(productCost(product))}</td>
                  <td className="px-4 py-1.5 text-right">
                    <button
                      type="button"
                      className="icon-btn h-8 w-8"
                      title="Excluir"
                      onClick={async () => {
                        await deleteProduct(productID(product));
                        reload();
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {products.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">Nenhum produto cadastrado ainda.</div>
        ) : null}
      </div>
    </div>
  );
}
