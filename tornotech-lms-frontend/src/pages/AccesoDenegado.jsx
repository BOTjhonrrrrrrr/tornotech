import { Link, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import PageLayout from "../components/layout/PageLayout.jsx";

// Se muestra cuando ProtectedRoute bloquea una ruta por rol (ver components/auth/ProtectedRoute.jsx).
// El backend ya rechaza estas llamadas con 403 (SecurityConfig); esto es solo para que la UI no se
// vea "rota" si alguien navega directo a una URL que no le corresponde.
export default function AccesoDenegado() {
  const location = useLocation();
  const ruta = location.state?.ruta;

  return (
    <PageLayout>
      <div className="flex flex-col items-center justify-center text-center py-24 gap-3">
        <div className="bg-surface-container-highest border border-outline-variant text-error rounded-xl p-4">
          <ShieldAlert size={32} />
        </div>
        <h1 className="text-headline-md font-headline-md text-on-surface">Acceso no autorizado</h1>
        <p className="text-body-md font-body-md text-on-surface-variant max-w-sm">
          Tu rol no tiene permiso para ver {ruta ? <span className="font-semibold">{ruta}</span> : "esta sección"}.
        </p>
        <Link
          to="/"
          className="mt-2 px-4 py-2 rounded text-label-sm font-label-sm font-bold uppercase tracking-wider bg-primary text-on-primary hover:bg-primary-fixed-dim transition-colors"
        >
          Volver al Dashboard
        </Link>
      </div>
    </PageLayout>
  );
}
