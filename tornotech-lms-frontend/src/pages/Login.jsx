import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { LogIn, Cog } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login, cargando } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("admin@tornotech.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      const destino = location.state?.from || "/";
      navigate(destino, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Credenciales inválidas");
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="bg-surface-container border border-outline-variant rounded-xl shadow-xl w-full max-w-sm p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-surface-container-highest border border-outline-variant text-primary rounded-xl p-3 mb-3">
            <Cog size={28} />
          </div>
          <h1 className="text-headline-md font-headline-md font-bold text-on-surface">TornoTech LMS</h1>
          <p className="text-label-sm font-label-sm text-on-surface-variant tracking-widest uppercase mt-1">
            Precision LMS
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1 uppercase tracking-wider">
              Correo
            </label>
            <input
              type="email"
              className="w-full bg-surface-container-highest border border-outline-variant text-on-surface rounded px-3 py-2 text-sm focus:border-primary outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1 uppercase tracking-wider">
              Contraseña
            </label>
            <input
              type="password"
              className="w-full bg-surface-container-highest border border-outline-variant text-on-surface rounded px-3 py-2 text-sm focus:border-primary outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-error bg-error-container/20 border border-error/40 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-primary hover:bg-primary-fixed-dim text-on-primary rounded py-2.5 text-label-sm font-label-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-[0_0_10px_rgba(131,207,255,0.2)]"
          >
            <LogIn size={16} />
            {cargando ? "Ingresando…" : "Ingresar"}
          </button>
        </form>

        <p className="text-label-sm font-label-sm text-on-surface-variant mt-6 text-center">
          ¿No tienes cuenta?{" "}
          <Link to="/registro" className="text-primary hover:underline">
            Regístrate
          </Link>
        </p>

        <p className="text-label-sm font-code-md text-on-surface-variant mt-4 text-center leading-relaxed">
          Usuarios de prueba (DataSeeder):<br />
          admin@tornotech.com / Admin123!<br />
          instructor@tornotech.com / Instructor123!<br />
          empleado@tornotech.com / Empleado123!
        </p>
      </div>
    </div>
  );
}
