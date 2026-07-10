import { Calculator, History, LogOut, Package, Settings, Tags } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";

const navItems = [
  { to: "/pricing", label: "Precificador", icon: Calculator },
  { to: "/products", label: "Produtos", icon: Package },
  { to: "/simulations", label: "Simulações", icon: History },
  { to: "/settings", label: "Ajustes", icon: Settings }
];

export function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-slate-200 bg-white/90 px-4 py-5 backdrop-blur lg:block dark:border-line dark:bg-ink/80">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-ember text-white">
          <Tags size={22} />
        </div>
        <div>
          <p className="text-lg font-black">pricing-hub</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Marketplaces</p>
        </div>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition",
                isActive
                  ? "bg-slate-900 text-white dark:bg-mint dark:text-slate-950"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
              ].join(" ")
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <button type="button" onClick={handleLogout} className="btn-secondary absolute bottom-5 left-4 right-4">
        <LogOut size={17} />
        Sair
      </button>
    </aside>
  );
}
