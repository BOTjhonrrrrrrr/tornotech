import { NavLink } from "react-router-dom";
import { LayoutDashboard, Code2, SlidersHorizontal, BarChart3, ClipboardCheck, Users, Award, Settings, Headset, Cog, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";

// Roles en espejo de SecurityConfig (backend) y de App.jsx (ProtectedRoute): un link visible que
// llevara a un 403 real es peor que no mostrarlo.
const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/simulador", label: "CNC Editor", icon: Code2, roles: ["ADMINISTRADOR", "INSTRUCTOR", "APRENDIZ"] },
  { to: "/instruccion", label: "Instructor", icon: SlidersHorizontal, roles: ["ADMINISTRADOR", "INSTRUCTOR"] },
  // RF-14: solo tiene sentido para quien califica intentos.
  { to: "/calificar", label: "Calificar", icon: ClipboardCheck, roles: ["ADMINISTRADOR", "INSTRUCTOR"] },
  { to: "/reportes", label: "Analytics", icon: BarChart3, roles: ["ADMINISTRADOR", "INSTRUCTOR", "OBSERVADOR"] },
  { to: "/mis-certificados", label: "Mis certificados", icon: Award },
  // RF-02/RF-03: gestion de usuarios, solo visible (y solo permitido en el backend) para ADMINISTRADOR
  { to: "/admin/usuarios", label: "Usuarios", icon: Users, roles: ["ADMINISTRADOR"] },
];

export default function Sidebar({ visible, onClose }) {
  const { usuario } = useAuth();
  const linksVisibles = links.filter((link) => !link.roles || link.roles.includes(usuario?.rol));

  // Al hacer click en un link: en movil el panel es un overlay, asi que conviene cerrarlo para
  // ver el contenido debajo; en desktop empuja el contenido (no lo tapa), asi que se deja abierto.
  function alNavegar() {
    if (window.innerWidth < 768) onClose();
  }

  return (
    <>
      {/* Backdrop: solo en movil, donde el panel se superpone en vez de empujar el contenido */}
      {visible && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={onClose} aria-hidden="true" />
      )}

      <aside
        className={`flex flex-col fixed left-0 top-0 h-full w-64 pt-16 z-40 bg-surface-dim border-r border-outline-variant transition-transform duration-200 ${
          visible ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="px-margin py-6 border-b border-outline-variant flex items-center justify-between gap-2 absolute top-0 left-0 w-full h-16 bg-surface-container-low">
          <div className="flex items-center gap-3">
            <Cog className="text-primary" size={22} />
            <div>
              <div className="text-headline-sm font-headline-md font-black text-on-surface leading-tight">
                TornoTech
              </div>
              <div className="text-label-sm font-label-sm text-on-surface-variant tracking-widest uppercase">
                Precision LMS
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface hover:bg-surface-bright transition-colors rounded p-1 shrink-0"
            title="Ocultar menú"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto mt-6 flex flex-col gap-1 px-2">
          {linksVisibles.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={alNavegar}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-label-sm font-label-sm tracking-wider uppercase transition-colors ${
                  isActive
                    ? "bg-primary-container text-on-primary-container border-r-4 border-primary"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </div>

        <div className="border-t border-outline-variant p-2 flex flex-col gap-1">
          <button
            type="button"
            className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors text-label-sm font-label-sm tracking-wider uppercase"
          >
            <Settings size={18} />
            Settings
          </button>
          <button
            type="button"
            className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors text-label-sm font-label-sm tracking-wider uppercase"
          >
            <Headset size={18} />
            Support
          </button>
        </div>
      </aside>
    </>
  );
}
