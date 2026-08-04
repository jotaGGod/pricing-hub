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
  Receipt,
  Settings,
  Tags,
  type LucideIcon
} from "lucide-react";
import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";

type NavSubItem = { to: string; label: string; icon: LucideIcon };

const pricingSubItems: NavSubItem[] = [
  { to: "/pricing", label: "Cálculo", icon: Calculator },
  { to: "/products", label: "Produtos", icon: Package },
  { to: "/simulations", label: "Simulações", icon: History },
  { to: "/taxes", label: "Taxas e Custos", icon: Percent }
];

const financeSubItems: NavSubItem[] = [
  { to: "/finance/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/finance/transactions", label: "Transações", icon: ArrowLeftRight },
  { to: "/finance/dre", label: "DRE", icon: Receipt },
  { to: "/finance/categories", label: "Categorias", icon: Tags }
];

const navItems = [{ to: "/settings", label: "Ajustes", icon: Settings }];

const linkBaseClass = "flex h-10 items-center gap-3 rounded-full px-3.5 text-sm font-medium transition duration-150 ease-snap";
const linkActiveClass =
  "bg-ember/10 text-ember shadow-[inset_0_0_0_1px_rgba(252,76,2,0.08)] dark:bg-ember/15 dark:text-orange-200";
const linkInactiveClass = "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10";

export function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const pricingActive = ["/pricing", "/products", "/simulations", "/taxes"].some((route) =>
    location.pathname.startsWith(route)
  );
  const financeActive = location.pathname.startsWith("/finance");

  const [pricingExpanded, setPricingExpanded] = useState(pricingActive);
  const [financeExpanded, setFinanceExpanded] = useState(financeActive);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200/80 bg-white/90 px-3 py-4 backdrop-blur-xl lg:block dark:border-line dark:bg-ink/90">
      <div className="mb-6 flex items-center gap-3 px-2">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-ember text-white shadow-glow">
          <Tags size={19} />
        </div>
        <div className="min-w-0">
          <p className="text-display truncate text-[13px] leading-none tracking-normal">nexosgen | pricing-hub</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Marketplaces</p>
        </div>
      </div>

      <nav className="space-y-1">
        <NavGroup
          label="Precificador"
          icon={Calculator}
          to="/pricing"
          active={pricingActive}
          expanded={pricingExpanded}
          setExpanded={setPricingExpanded}
          subItems={pricingSubItems}
        />

        <NavGroup
          label="Financeiro"
          icon={PiggyBank}
          to="/finance/dashboard"
          active={financeActive}
          expanded={financeExpanded}
          setExpanded={setFinanceExpanded}
          subItems={financeSubItems}
        />

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

function NavGroup({
  label,
  icon: Icon,
  to,
  active,
  expanded,
  setExpanded,
  subItems
}: {
  label: string;
  icon: LucideIcon;
  to: string;
  active: boolean;
  expanded: boolean;
  setExpanded: (update: boolean | ((prev: boolean) => boolean)) => void;
  subItems: NavSubItem[];
}) {
  return (
    <div>
      <div className={["flex items-center rounded-full transition duration-150 ease-snap", active ? linkActiveClass : linkInactiveClass].join(" ")}>
        {/* Entering the section always reveals its sub-tabs. The chevron below
            is the only thing that toggles — it works no matter which page is
            currently active, so a section's sub-tabs can be peeked at or
            collapsed from anywhere in the app. */}
        <NavLink
          to={to}
          onClick={() => setExpanded(true)}
          className="flex h-10 flex-1 items-center gap-3 px-3.5 text-sm font-medium"
        >
          <Icon size={18} />
          {label}
        </NavLink>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex h-10 w-9 shrink-0 items-center justify-center"
          aria-expanded={expanded}
          aria-label={expanded ? `Recolher ${label}` : `Expandir ${label}`}
        >
          <ChevronDown size={15} className={`transition-transform duration-150 ease-snap ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>

      {expanded ? (
        <div className="mt-1 space-y-1 border-l border-slate-200 py-0.5 pl-3 dark:border-line">
          {subItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "flex h-9 items-center gap-2.5 rounded-full px-3.5 text-sm font-medium transition duration-150 ease-snap",
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
  );
}
