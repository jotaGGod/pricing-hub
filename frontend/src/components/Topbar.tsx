import { Moon, Sun } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { useTheme } from "../features/settings/ThemeContext";

const mobileItems = [
  { to: "/pricing", label: "Preco" },
  { to: "/products", label: "Produtos" },
  { to: "/simulations", label: "Sims" },
  { to: "/settings", label: "Ajustes" }
];

export function Topbar() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-line dark:bg-ink/75">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <nav className="flex gap-1 lg:hidden">
          {mobileItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "rounded-md px-2 py-2 text-xs font-bold",
                  isActive ? "bg-slate-900 text-white dark:bg-mint dark:text-slate-950" : "text-slate-500"
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
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
