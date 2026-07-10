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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <article key={productID(product)} className="glass-card p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-black">{productTitle(product)}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatBRL(productCost(product))}</p>
              </div>
              <button
                type="button"
                className="icon-btn"
                title="Excluir"
                onClick={async () => {
                  await deleteProduct(productID(product));
                  reload();
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
