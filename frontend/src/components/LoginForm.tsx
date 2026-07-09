import { useState } from "react";
import type { FormEvent } from "react";
import { Chrome, LogIn } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { googleStartUrl } from "../services/auth";
import { useAuth } from "../features/auth/AuthContext";

export function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate("/pricing", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <h2 className="text-xl font-black">Entrar</h2>
      <label className="block space-y-2">
        <span className="field-label">Email</span>
        <input className="input-base" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label className="block space-y-2">
        <span className="field-label">Senha</span>
        <input
          className="input-base"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      {error ? <p className="text-sm font-semibold text-orange-500">{error}</p> : null}
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        <LogIn size={17} />
        Entrar
      </button>
      <a className="btn-secondary w-full" href={googleStartUrl()}>
        <Chrome size={17} />
        Google
      </a>
      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        <Link className="font-bold text-ember" to="/register">
          Criar conta
        </Link>
      </p>
    </form>
  );
}
