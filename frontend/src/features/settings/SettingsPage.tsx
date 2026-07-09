import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ThemeSettings } from "../../components/ThemeSettings";
import { useAuth } from "../auth/AuthContext";

export function SettingsPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-3xl font-black">Ajustes</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">Preferencias da conta</p>
      </div>
      <ThemeSettings />
      <section className="glass-card p-5">
        <h2 className="mb-4 text-base font-black">Sessao</h2>
        <button
          type="button"
          className="btn-secondary"
          onClick={async () => {
            await logout();
            navigate("/login", { replace: true });
          }}
        >
          <LogOut size={17} />
          Sair
        </button>
      </section>
    </div>
  );
}
