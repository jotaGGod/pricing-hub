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
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                "flex h-10 items-center gap-3 rounded-[10px] px-3 text-sm font-medium transition",
                isActive
                  ? "bg-ember/10 text-ember shadow-[inset_0_0_0_1px_rgba(255,63,135,0.08)] dark:bg-ember/15 dark:text-pink-200"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
              ].join(" ")
            }
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
