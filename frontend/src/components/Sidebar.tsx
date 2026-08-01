import {
  ArrowLeftRight,
  Calculator,
  ChevronDown,
  History,
  LayoutDashboard,
  LogOut,
  Package,
  Percent,
  PiggyBank,
  Settings,
  Tags
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";

const financeSubItems = [
  { to: "/finance/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/finance/transactions", label: "Transações", icon: ArrowLeftRight },
  { to: "/finance/categories", label: "Categorias", icon: Tags }
];

const navItems = [
  { to: "/products", label: "Produtos", icon: Package },
  { to: "/simulations", label: "Simulações", icon: History },
  { to: "/taxes", label: "Taxas e Custos", icon: Percent },
  { to: "/settings", label: "Ajustes", icon: Settings }
];

const linkBaseClass = "flex h-10 items-center gap-3 rounded-[10px] px-3 text-sm font-medium transition";
const linkActiveClass =
  "bg-ember/10 text-ember shadow-[inset_0_0_0_1px_rgba(255,63,135,0.08)] dark:bg-ember/15 dark:text-pink-200";
const linkInactiveClass = "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10";

export function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const financeActive = location.pathname.startsWith("/finance");
  const [financeExpanded, setFinanceExpanded] = useState(financeActive);

  // Browsing into /finance by any route (mobile nav, direct link, back button)
  // keeps the section expanded so the sub-tab the user is on stays visible.
  useEffect(() => {
    if (financeActive) {
      setFinanceExpanded(true);
    }
  }, [financeActive]);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200/80 bg-white/90 px-3 py-4 backdrop-blur-xl lg:block dark:border-line dark:bg-ink/90">
      <div className="mb-6 flex items-center gap-3 px-2">
        <div className="grid h-9 w-9 place-items-center rounded-[10px] bg-ember text-white shadow-glow">
          <Tags size={19} />
        </div>
        <div>
          <p className="text-base font-bold">pricing-hub</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Marketplaces</p>
        </div>
      </div>

      <nav className="space-y-1">
        <NavLink
          to="/pricing"
          className={({ isActive }) => [linkBaseClass, isActive ? linkActiveClass : linkInactiveClass].join(" ")}
        >
          <Calculator size={18} />
          Precificador
        </NavLink>

        <div>
          <button
            type="button"
            onClick={() => {
              if (financeActive) {
                // Already inside Financeiro: the click is purely about the
                // disclosure, not navigation — toggle it instead of forcing
                // the user back to the dashboard sub-tab.
                setFinanceExpanded((expanded) => !expanded);
              } else {
                setFinanceExpanded(true);
                navigate("/finance/dashboard");
              }
            }}
            className={[
              "w-full",
              linkBaseClass,
              "justify-between",
              financeActive ? linkActiveClass : linkInactiveClass
            ].join(" ")}
            aria-expanded={financeExpanded}
          >
            <span className="flex items-center gap-3">
              <PiggyBank size={18} />
              Financeiro
            </span>
            <ChevronDown
              size={15}
              className={`shrink-0 transition-transform ${financeExpanded ? "rotate-180" : ""}`}
            />
          </button>

          {financeExpanded ? (
            <div className="mt-1 space-y-1 border-l border-slate-200 py-0.5 pl-3 dark:border-line">
              {financeSubItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      "flex h-9 items-center gap-2.5 rounded-[9px] px-3 text-sm font-medium transition",
                      isActive ? linkActiveClass : linkInactiveClass
                    ].join(" ")
                  }
                >
                  <item.icon size={16} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          ) : null}
        </div>

        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => [linkBaseClass, isActive ? linkActiveClass : linkInactiveClass].join(" ")}
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <button type="button" onClick={handleLogout} className="btn-secondary absolute bottom-4 left-3 right-3">
        <LogOut size={17} />
        Sair
      </button>
    </aside>
  );
}
