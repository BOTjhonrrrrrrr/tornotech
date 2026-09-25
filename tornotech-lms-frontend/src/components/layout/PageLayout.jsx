import { useState } from "react";
import Sidebar from "./Sidebar.jsx";
import Navbar from "./Navbar.jsx";

/**
 * Shell compartido: TopNavBar fijo arriba + Sidebar fijo a la izquierda, ocultable por completo
 * (un solo estado controla tanto el drawer superpuesto en movil como el panel que empuja el
 * contenido en desktop -- un rail colapsado a iconos no se leia como "oculto", por eso se
 * simplifico a mostrar/ocultar completo).
 * Cada página arma su propio encabezado dentro de <main> (título, acciones),
 * siguiendo el patrón de los mockups (no hay un único "titulo" genérico).
 */
export default function PageLayout({ children }) {
  // Cada pagina monta su propio PageLayout (no hay un shell persistente unico), asi que el estado
  // arranca segun el ancho de pantalla actual: visible en desktop, cerrado en movil (para no tapar
  // la pantalla con el drawer al entrar por primera vez desde un celular).
  const [sidebarVisible, setSidebarVisible] = useState(() => window.innerWidth >= 768);

  return (
    <div className="min-h-screen bg-background text-on-background font-body-md text-body-md">
      <Navbar onMenuClick={() => setSidebarVisible((v) => !v)} />
      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      {/* overflow-x-hidden: SimuladorCNC.jsx usa -m-margin para ir "full bleed" dentro del padding
          de p-margin de abajo, lo que lo hace 24px mas ancho que este contenedor por cada lado.
          Sin recortar ese sobrante aca, el navegador agrega una barra de scroll horizontal a TODA
          la pagina para acomodarlo, sin importar que tan bien se ajuste el contenido interno. */}
      <main
        className={`pt-16 min-h-screen max-w-container-max mx-auto w-full overflow-x-hidden transition-[margin] duration-200 ${
          sidebarVisible ? "md:ml-64" : "md:ml-0"
        }`}
      >
        <div className="p-margin">{children}</div>
      </main>
    </div>
  );
}
