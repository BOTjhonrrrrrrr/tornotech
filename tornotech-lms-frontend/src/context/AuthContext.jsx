import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/client.js";

const AuthContext = createContext(null);

const TOKEN_KEY = "tornotech_token";
const USUARIO_KEY = "tornotech_usuario";

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const guardado = localStorage.getItem(USUARIO_KEY);
    return guardado ? JSON.parse(guardado) : null;
  });
  const [cargando, setCargando] = useState(false);

  // Si otra pestaña cierra sesión (ver interceptor 401 en client.js), refleja el cambio aquí
  useEffect(() => {
    function onStorage(e) {
      if (e.key === TOKEN_KEY && !e.newValue) {
        setUsuario(null);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  async function login(email, password) {
    setCargando(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      const usuarioLogueado = { id: data.id, nombre: data.nombre, rol: data.rol };
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USUARIO_KEY, JSON.stringify(usuarioLogueado));
      setUsuario(usuarioLogueado);
      return usuarioLogueado;
    } finally {
      setCargando(false);
    }
  }

  // Auto-registro publico (RF-01): crea la cuenta APRENDIZ y deja la sesión iniciada,
  // igual que login() -- el backend ya devuelve un LoginResponse con token.
  async function registrar(nombre, email, password) {
    setCargando(true);
    try {
      const { data } = await api.post("/auth/registro", { nombre, email, password });
      const usuarioLogueado = { id: data.id, nombre: data.nombre, rol: data.rol };
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USUARIO_KEY, JSON.stringify(usuarioLogueado));
      setUsuario(usuarioLogueado);
      return usuarioLogueado;
    } finally {
      setCargando(false);
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, login, registrar, logout, cargando }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
