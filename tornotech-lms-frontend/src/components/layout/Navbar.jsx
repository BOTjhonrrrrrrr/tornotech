import { Bell, HelpCircle, LogOut, Search, Cog, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

/** TopNavBar fijo, compartido por todas las pantallas (ver mockups Stitch). */
export default function Navbar({ onMenuClick }) {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  function onLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="fixed top-0 left-0 flex justify-between items-center w-full px-margin h-16 z-50 bg-surface-container border-b border-outline-variant">
      <div className="flex items-center gap-margin">
        {/* Muestra/oculta el Sidebar: en movil es un drawer superpuesto, en desktop empuja el
            contenido (ver Sidebar.jsx/PageLayout.jsx). Visible siempre (no solo en movil) para
            poder volver a mostrarlo despues de ocultarlo en escritorio. */}
        <button
          type="button"
          onClick={onMenuClick}
          className="text-on-surface-variant hover:text-on-surface hover:bg-surface-bright transition-colors p-2 rounded"
          aria-label="Mostrar/ocultar menú"
        >
          <Menu size={20} />
        </button>

        <div className="text-headline-md font-headline-md font-bold text-primary flex items-center gap-2">
          <Cog size={22} />
          <span className="hidden sm:inline">TornoTech LMS</span>
        </div>

        <div className="hidden md:flex items-center bg-surface-container-highest border border-outline-variant rounded px-3 py-1.5 focus-within:border-primary transition-colors">
          <Search size={16} className="text-on-surface-variant" />
          <input
            className="bg-transparent border-none focus:ring-0 text-body-md font-body-md text-on-surface placeholder:text-on-surface-variant py-0 px-2 w-48 outline-none"
            placeholder="Search resources..."
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="text-on-surface-variant hover:bg-surface-bright transition-colors p-2 rounded-full" aria-label="Notificaciones">
          <Bell size={20} />
        </button>
        <button className="text-on-surface-variant hover:bg-surface-bright transition-colors p-2 rounded-full" aria-label="Ayuda">
          <HelpCircle size={20} />
        </button>
        <div className="flex items-center gap-2 pl-2 border-l border-outline-variant">
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-label-sm font-label-sm font-bold">
            {usuario?.nombre?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="text-sm leading-tight hidden lg:block">
            <p className="font-medium text-on-surface text-body-md">{usuario?.nombre}</p>
            <p className="text-on-surface-variant text-label-sm font-label-sm">{usuario?.rol}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="text-on-surface-variant hover:text-error transition-colors"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}
