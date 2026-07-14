import { Calculator, History, Moon, Package, Settings, Sun } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { useTheme } from "../features/settings/ThemeContext";

const mobileItems = [
  { to: "/pricing", label: "Preço", icon: Calculator },
  { to: "/products", label: "Produtos", icon: Package },
  { to: "/simulations", label: "Simulações", icon: History },
  { to: "/settings", label: "Ajustes", icon: Settings }
];

export function Topbar() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="no-print sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl dark:border-line dark:bg-ink/85">
      <div className="flex h-14 items-center justify-between gap-2 px-3 sm:px-5 lg:px-6">
        <nav className="flex min-w-0 flex-1 gap-1 lg:hidden">
          {mobileItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-[10px] px-2 text-xs font-semibold transition",
                  isActive
                    ? "bg-ember/10 text-ember dark:bg-ember/15 dark:text-pink-200"
                    : "text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
                ].join(" ")
              }
              title={item.label}
              aria-label={item.label}
            >
              <item.icon size={17} />
              <span className="hidden min-[390px]:inline">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" className="icon-btn" onClick={toggleTheme} title="Alternar tema">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-bold">{user?.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
