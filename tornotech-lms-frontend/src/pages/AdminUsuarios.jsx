import { useEffect, useState } from "react";
import { Users, UserPlus, Check, X, Power, Pencil } from "lucide-react";
import PageLayout from "../components/layout/PageLayout.jsx";
import api from "../api/client.js";

// RF-02/RF-03: pantalla de administración de usuarios. Solo ADMINISTRADOR llega aquí (ver
// Sidebar.jsx y App.jsx); el backend lo exige igual via SecurityConfig (hasRole ADMINISTRADOR)
// asi que esto es solo una capa extra de UX, no la unica proteccion.

const ROLES = ["ADMINISTRADOR", "INSTRUCTOR", "APRENDIZ", "OBSERVADOR"];

const REGLAS_PASSWORD = [
  { etiqueta: "10+ caracteres", test: (p) => p.length >= 10 },
  { etiqueta: "Mayúscula", test: (p) => /[A-Z]/.test(p) },
  { etiqueta: "Minúscula", test: (p) => /[a-z]/.test(p) },
  { etiqueta: "Número", test: (p) => /[0-9]/.test(p) },
  { etiqueta: "Símbolo", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const formInicial = { nombre: "", email: "", password: "", rol: "APRENDIZ", grupoId: "" };

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(formInicial);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [edicion, setEdicion] = useState({ rol: "", grupoId: "" });
  // Separado de "error" (que es del formulario de creacion) para no pisar el mensaje si el usuario
  // tiene el form abierto cuando falla una recarga de la lista.
  const [errorCarga, setErrorCarga] = useState(null);

  function cargar() {
    setCargando(true);
    setErrorCarga(null);
    Promise.all([api.get("/usuarios"), api.get("/grupos")])
      .then(([u, g]) => {
        setUsuarios(u.data);
        setGrupos(g.data);
      })
      .catch(() => setErrorCarga("No se pudo cargar la lista de usuarios."))
      .finally(() => setCargando(false));
  }

  useEffect(cargar, []);

  const passwordValida = REGLAS_PASSWORD.every((r) => r.test(form.password));

  async function crear(e) {
    e.preventDefault();
    setError(null);
    if (!passwordValida) {
      setError("La contraseña no cumple el estándar requerido");
      return;
    }
    setEnviando(true);
    try {
      await api.post("/usuarios", {
        nombre: form.nombre,
        email: form.email,
        password: form.password,
        rol: form.rol,
        grupoId: form.grupoId || null,
      });
      setForm(formInicial);
      setMostrarForm(false);
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo crear el usuario");
    } finally {
      setEnviando(false);
    }
  }

  function iniciarEdicion(usuario) {
    setEditandoId(usuario.id);
    setEdicion({ rol: usuario.rol, grupoId: usuario.grupo?.id || "" });
  }

  async function guardarEdicion(usuario) {
    setEnviando(true);
    try {
      await api.put(`/usuarios/${usuario.id}`, {
        nombre: usuario.nombre,
        rol: edicion.rol,
        grupo: edicion.grupoId ? { id: Number(edicion.grupoId) } : null,
        activo: usuario.activo,
      });
      setEditandoId(null);
      cargar();
    } finally {
      setEnviando(false);
    }
  }

  async function alternarActivo(usuario) {
    setEnviando(true);
    try {
      if (usuario.activo) {
        await api.delete(`/usuarios/${usuario.id}`);
      } else {
        await api.put(`/usuarios/${usuario.id}`, {
          nombre: usuario.nombre,
          rol: usuario.rol,
          grupo: usuario.grupo,
          activo: true,
        });
      }
      cargar();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <PageLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-headline-lg font-headline-lg text-on-surface mb-1 flex items-center gap-2">
            <Users size={24} className="text-primary" />
            Administración de usuarios
          </h1>
          <p className="text-on-surface-variant text-body-md font-body-md">
            Crea cuentas, asigna roles y grupos, o desactiva accesos.
          </p>
        </div>
        <button
          onClick={() => {
            setMostrarForm((v) => !v);
            setError(null);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded text-label-sm font-label-sm font-bold uppercase tracking-wider bg-primary text-on-primary hover:bg-primary-fixed-dim transition-colors"
        >
          <UserPlus size={16} />
          Nuevo usuario
        </button>
      </div>

      {mostrarForm && (
        <form
          onSubmit={crear}
          className="bg-surface-container-low border border-outline-variant rounded p-4 mb-gutter grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1 uppercase tracking-wider">
              Nombre
            </label>
            <input
              type="text"
              required
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full bg-surface-container-highest border border-outline-variant text-on-surface rounded px-3 py-2 text-sm focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1 uppercase tracking-wider">
              Correo
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-surface-container-highest border border-outline-variant text-on-surface rounded px-3 py-2 text-sm focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1 uppercase tracking-wider">
              Rol
            </label>
            <select
              value={form.rol}
              onChange={(e) => setForm({ ...form, rol: e.target.value })}
              className="w-full bg-surface-container-highest border border-outline-variant text-on-surface rounded px-3 py-2 text-sm focus:border-primary outline-none"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1 uppercase tracking-wider">
              Grupo (opcional)
            </label>
            <select
              value={form.grupoId}
              onChange={(e) => setForm({ ...form, grupoId: e.target.value })}
              className="w-full bg-surface-container-highest border border-outline-variant text-on-surface rounded px-3 py-2 text-sm focus:border-primary outline-none"
            >
              <option value="">Sin grupo</option>
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1 uppercase tracking-wider">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-surface-container-highest border border-outline-variant text-on-surface rounded px-3 py-2 text-sm focus:border-primary outline-none"
            />
            {form.password.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                {REGLAS_PASSWORD.map((r) => {
                  const ok = r.test(form.password);
                  return (
                    <span
                      key={r.etiqueta}
                      className={`text-label-sm flex items-center gap-1 ${
                        ok ? "text-primary" : "text-on-surface-variant"
                      }`}
                    >
                      {ok ? <Check size={12} /> : <X size={12} />}
                      {r.etiqueta}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {error && (
            <p className="md:col-span-2 text-sm text-error bg-error-container/20 border border-error/40 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={enviando}
              className="flex items-center gap-2 px-4 py-2 rounded text-label-sm font-label-sm font-bold uppercase tracking-wider bg-primary text-on-primary hover:bg-primary-fixed-dim transition-colors disabled:opacity-50"
            >
              <UserPlus size={16} />
              Crear usuario
            </button>
          </div>
        </form>
      )}

      {errorCarga && (
        <div className="mb-4 rounded bg-error-container/20 text-error text-sm px-4 py-3 border border-error/40">
          {errorCarga}
        </div>
      )}

      <div className="bg-surface-container-low border border-outline-variant rounded overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-outline-variant text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">
              <th className="p-3">Nombre</th>
              <th className="p-3">Correo</th>
              <th className="p-3">Rol</th>
              <th className="p-3">Grupo</th>
              <th className="p-3">Estado</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr>
                <td colSpan={6} className="p-4 text-on-surface-variant text-sm">
                  Cargando…
                </td>
              </tr>
            )}
            {!cargando && usuarios.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-on-surface-variant text-sm">
                  No hay usuarios registrados.
                </td>
              </tr>
            )}
            {usuarios.map((usuario) => {
              const enEdicion = editandoId === usuario.id;
              return (
                <tr key={usuario.id} className="border-b border-outline-variant last:border-0">
                  <td className="p-3 text-body-md font-body-md text-on-surface">{usuario.nombre}</td>
                  <td className="p-3 text-body-md font-body-md text-on-surface-variant">{usuario.email}</td>
                  <td className="p-3">
                    {enEdicion ? (
                      <select
                        value={edicion.rol}
                        onChange={(e) => setEdicion({ ...edicion, rol: e.target.value })}
                        className="bg-surface-container-highest border border-outline-variant text-on-surface rounded px-2 py-1 text-sm focus:border-primary outline-none"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="px-2 py-0.5 bg-surface-container-highest border border-outline-variant rounded text-label-sm">
                        {usuario.rol}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-body-md font-body-md text-on-surface-variant">
                    {enEdicion ? (
                      <select
                        value={edicion.grupoId}
                        onChange={(e) => setEdicion({ ...edicion, grupoId: e.target.value })}
                        className="bg-surface-container-highest border border-outline-variant text-on-surface rounded px-2 py-1 text-sm focus:border-primary outline-none"
                      >
                        <option value="">Sin grupo</option>
                        {grupos.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.nombre}
                          </option>
                        ))}
                      </select>
                    ) : (
                      usuario.grupo?.nombre || "—"
                    )}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 bg-surface-container-highest border rounded text-label-sm ${
                        usuario.activo ? "border-primary text-primary" : "border-error text-error"
                      }`}
                    >
                      {usuario.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      {enEdicion ? (
                        <>
                          <button
                            onClick={() => setEditandoId(null)}
                            className="p-1.5 rounded border border-outline-variant text-on-surface-variant hover:text-on-surface transition-colors"
                            title="Cancelar"
                          >
                            <X size={14} />
                          </button>
                          <button
                            onClick={() => guardarEdicion(usuario)}
                            disabled={enviando}
                            className="p-1.5 rounded border border-primary text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                            title="Guardar"
                          >
                            <Check size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => iniciarEdicion(usuario)}
                            className="p-1.5 rounded border border-outline-variant text-on-surface-variant hover:text-on-surface transition-colors"
                            title="Editar rol/grupo"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => alternarActivo(usuario)}
                            disabled={enviando}
                            className={`p-1.5 rounded border transition-colors disabled:opacity-50 ${
                              usuario.activo
                                ? "border-error/40 text-error hover:bg-error/10"
                                : "border-primary/40 text-primary hover:bg-primary/10"
                            }`}
                            title={usuario.activo ? "Desactivar" : "Reactivar"}
                          >
                            <Power size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </PageLayout>
  );
}
