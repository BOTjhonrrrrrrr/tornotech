import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus, Cog, Check, X } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

// Espejo del estándar del backend (PasswordValidator): 10+, mayúscula, minúscula, número, símbolo.
// Es solo feedback visual inmediato -- la validación real y definitiva ocurre en el servidor.
const REGLAS_PASSWORD = [
  { etiqueta: "Al menos 10 caracteres", test: (p) => p.length >= 10 },
  { etiqueta: "Una letra mayúscula", test: (p) => /[A-Z]/.test(p) },
  { etiqueta: "Una letra minúscula", test: (p) => /[a-z]/.test(p) },
  { etiqueta: "Un número", test: (p) => /[0-9]/.test(p) },
  { etiqueta: "Un símbolo (! @ # $ %…)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export default function Registro() {
  const { registrar, cargando } = useAuth();
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState(null);

  const passwordValida = REGLAS_PASSWORD.every((r) => r.test(password));
  const coincide = password.length > 0 && password === confirmar;

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!passwordValida) {
      setError("La contraseña no cumple el estándar requerido");
      return;
    }
    if (!coincide) {
      setError("Las contraseñas no coinciden");
      return;
    }

    try {
      await registrar(nombre, email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo crear la cuenta");
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="bg-surface-container border border-outline-variant rounded-xl shadow-xl w-full max-w-sm p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-surface-container-highest border border-outline-variant text-primary rounded-xl p-3 mb-3">
            <Cog size={28} />
          </div>
          <h1 className="text-headline-md font-headline-md font-bold text-on-surface">TornoTech LMS</h1>
          <p className="text-label-sm font-label-sm text-on-surface-variant tracking-widest uppercase mt-1">
            Crear cuenta
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1 uppercase tracking-wider">
              Nombre completo
            </label>
            <input
              type="text"
              className="w-full bg-surface-container-highest border border-outline-variant text-on-surface rounded px-3 py-2 text-sm focus:border-primary outline-none"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>
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
            {password.length > 0 && (
              <ul className="mt-2 space-y-1">
                {REGLAS_PASSWORD.map((r) => {
                  const ok = r.test(password);
                  return (
                    <li
                      key={r.etiqueta}
                      className={`text-label-sm flex items-center gap-1.5 ${
                        ok ? "text-primary" : "text-on-surface-variant"
                      }`}
                    >
                      {ok ? <Check size={12} /> : <X size={12} />}
                      {r.etiqueta}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div>
            <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1 uppercase tracking-wider">
              Confirmar contraseña
            </label>
            <input
              type="password"
              className="w-full bg-surface-container-highest border border-outline-variant text-on-surface rounded px-3 py-2 text-sm focus:border-primary outline-none"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              required
            />
            {confirmar.length > 0 && !coincide && (
              <p className="text-label-sm text-error mt-1">Las contraseñas no coinciden</p>
            )}
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
            <UserPlus size={16} />
            {cargando ? "Creando cuenta…" : "Crear cuenta"}
          </button>
        </form>

        <p className="text-label-sm font-label-sm text-on-surface-variant mt-6 text-center">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
