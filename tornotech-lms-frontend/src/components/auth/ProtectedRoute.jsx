import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

// roles (opcional): lista de roles permitidos. Si se omite, cualquier usuario autenticado entra.
// El backend ya exige el rol correcto a nivel de API (ver SecurityConfig) -- esto es solo la capa
// de UX para no dejar una ruta admin "navegable" (aunque vacia/rota) por URL directa.
export default function ProtectedRoute({ children, roles }) {
  const { usuario } = useAuth();
  const location = useLocation();

  if (!usuario) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (roles && !roles.includes(usuario.rol)) {
    return <Navigate to="/acceso-denegado" state={{ ruta: location.pathname }} replace />;
  }

  return children;
}
