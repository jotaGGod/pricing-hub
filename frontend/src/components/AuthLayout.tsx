import type { ReactNode } from "react";
import { Tags } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { googleStartUrl } from "../services/auth";

const tabBaseClass = "flex-1 rounded-full py-2 text-center text-sm font-semibold transition duration-150 ease-snap";
const tabActiveClass = "bg-white text-slate-900 shadow-sm dark:bg-ink dark:text-white";
const tabInactiveClass = "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200";

export function AuthLayout({ children }: { children: ReactNode }) {
  const isRegister = useLocation().pathname === "/register";

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4 py-10 text-slate-900 dark:bg-ink dark:text-slate-100">
      <section className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-ember text-white shadow-glow">
            <Tags size={24} />
          </div>
          <div>
            <h1 className="text-display normal-case text-xl leading-none tracking-normal">Pricing Hub by NexosGen</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Precificacao de marketplace</p>
          </div>
        </div>

        <div className="glass-card space-y-4 p-6">
          {/* Login and register share one card — this segmented control is the
              only way to switch between them, so the per-form footer links
              ("Criar conta" / "Entrar") that used to duplicate this were removed. */}
          <div className="flex rounded-full bg-slate-100 p-1 dark:bg-black/30">
            <NavLink
              to="/login"
              className={[tabBaseClass, isRegister ? tabInactiveClass : tabActiveClass].join(" ")}
            >
              Entrar
            </NavLink>
            <NavLink
              to="/register"
              className={[tabBaseClass, isRegister ? tabActiveClass : tabInactiveClass].join(" ")}
            >
              Criar conta
            </NavLink>
          </div>

          <a className="btn-secondary w-full" href={googleStartUrl()}>
            <img src="/google-logo.png" alt="" className="h-[18px] w-[18px]" />
            Continuar com Google
          </a>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200 dark:bg-line" />
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">ou</span>
            <span className="h-px flex-1 bg-slate-200 dark:bg-line" />
          </div>

          {children}
        </div>
      </section>
    </main>
  );
}
