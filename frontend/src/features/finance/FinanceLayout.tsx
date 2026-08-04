import { LayoutDashboard, ArrowLeftRight, Receipt, Tags } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

const subTabs = [
  { to: "/finance/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/finance/transactions", label: "Transações", icon: ArrowLeftRight },
  { to: "/finance/dre", label: "DRE", icon: Receipt },
  { to: "/finance/categories", label: "Categorias", icon: Tags }
];

export function FinanceLayout() {
  return (
    <div className="space-y-4">
      {/* Desktop navigates the finance sub-tabs from the left Sidebar; this bar
          is the mobile equivalent, since the sidebar's nested nav is hidden
          on small screens. */}
      <nav className="no-print flex flex-wrap gap-1.5 border-b border-slate-200 pb-2 lg:hidden dark:border-line">
        {subTabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              [
                "flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition duration-150 ease-snap",
                isActive
                  ? "bg-ember/10 text-ember dark:bg-ember/15 dark:text-orange-200"
                  : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
              ].join(" ")
            }
          >
            <tab.icon size={16} />
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
