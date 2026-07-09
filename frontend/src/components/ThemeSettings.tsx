import { Moon, Sun } from "lucide-react";
import { useTheme } from "../features/settings/ThemeContext";

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();
  return (
    <section className="glass-card p-5">
      <h2 className="mb-4 text-base font-black">Tema</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          className={[
            "flex h-14 items-center justify-center gap-2 rounded-md border text-sm font-black transition",
            theme === "dark"
              ? "border-mint bg-mint text-slate-950"
              : "border-slate-200 bg-white text-slate-600 dark:border-line dark:bg-slate-950/30 dark:text-slate-300"
          ].join(" ")}
          onClick={() => setTheme("dark")}
        >
          <Moon size={18} />
          Escuro
        </button>
        <button
          type="button"
          className={[
            "flex h-14 items-center justify-center gap-2 rounded-md border text-sm font-black transition",
            theme === "light"
              ? "border-ember bg-ember text-white"
              : "border-slate-200 bg-white text-slate-600 dark:border-line dark:bg-slate-950/30 dark:text-slate-300"
          ].join(" ")}
          onClick={() => setTheme("light")}
        >
          <Sun size={18} />
          Claro
        </button>
      </div>
    </section>
  );
}
