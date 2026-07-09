import { useState } from "react";
import type { FormEvent } from "react";
import { UserPlus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";

export function RegisterForm() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await register(name, email, password);
      navigate("/pricing", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no cadastro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <h2 className="text-xl font-black">Criar conta</h2>
      <label className="block space-y-2">
        <span className="field-label">Nome</span>
        <input className="input-base" value={name} onChange={(event) => setName(event.target.value)} />
      </label>
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
        <UserPlus size={17} />
        Cadastrar
      </button>
      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        <Link className="font-bold text-ember" to="/login">
          Entrar
        </Link>
      </p>
    </form>
  );
}
