import type { ReactNode } from "react";
import { Tags } from "lucide-react";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4 py-10 text-slate-900 dark:bg-ink dark:text-slate-100">
      <section className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-ember text-white">
            <Tags size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black">pricing-hub</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Precificacao de marketplace</p>
          </div>
        </div>
        <div className="glass-card p-6">{children}</div>
      </section>
    </main>
  );
}
