import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import GestionInstruccion from "./pages/GestionInstruccion.jsx";
import SimuladorCNC from "./pages/SimuladorCNC.jsx";
import Reportes from "./pages/Reportes.jsx";
import CalificarIntentos from "./pages/CalificarIntentos.jsx";
import AdminUsuarios from "./pages/AdminUsuarios.jsx";
import MisCertificados from "./pages/MisCertificados.jsx";
import Login from "./pages/Login.jsx";
import Registro from "./pages/Registro.jsx";
import AccesoDenegado from "./pages/AccesoDenegado.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";

// Control de acceso por rol en el frontend, en espejo de SecurityConfig (backend): sin esto, una
// ruta admin era navegable por URL directa aunque las llamadas a la API fallaran con 403 --
// ProtectedRoute ahora redirige a /acceso-denegado si el rol no coincide.
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/acceso-denegado" element={<ProtectedRoute><AccesoDenegado /></ProtectedRoute>} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route
        path="/instruccion"
        element={
          <ProtectedRoute roles={["ADMINISTRADOR", "INSTRUCTOR"]}>
            <GestionInstruccion />
          </ProtectedRoute>
        }
      />
      <Route
        path="/simulador"
        element={
          <ProtectedRoute roles={["ADMINISTRADOR", "INSTRUCTOR", "APRENDIZ"]}>
            <SimuladorCNC />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reportes"
        element={
          <ProtectedRoute roles={["ADMINISTRADOR", "INSTRUCTOR", "OBSERVADOR"]}>
            <Reportes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calificar"
        element={
          <ProtectedRoute roles={["ADMINISTRADOR", "INSTRUCTOR"]}>
            <CalificarIntentos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/usuarios"
        element={
          <ProtectedRoute roles={["ADMINISTRADOR"]}>
            <AdminUsuarios />
          </ProtectedRoute>
        }
      />
      <Route path="/mis-certificados" element={<ProtectedRoute><MisCertificados /></ProtectedRoute>} />
    </Routes>
  );
}
