import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  BookOpen,
  Activity,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  BadgeCheck,
  Code2,
  SlidersHorizontal,
  AlertTriangle,
  Download,
  PlayCircle,
  ClipboardCheck,
  Award,
  Clock,
  Send,
  Lock,
} from "lucide-react";
import PageLayout from "../components/layout/PageLayout.jsx";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

const tarjetas = [
  { key: "totalUsuarios", label: "Usuarios", icon: Users, accent: "text-primary" },
  { key: "totalEjercicios", label: "Ejercicios", icon: BookOpen, accent: "text-primary" },
  { key: "totalIntentos", label: "Intentos registrados", icon: Activity, accent: "text-secondary" },
  { key: "certificacionesVigentes", label: "Certificaciones vigentes", icon: ShieldCheck, accent: "text-primary" },
  { key: "certificacionesPorVencer", label: "Por vencer (30 días)", icon: ShieldAlert, accent: "text-secondary-container" },
  { key: "certificacionesVencidas", label: "Vencidas", icon: ShieldX, accent: "text-error" },
];

// Tarjetas simples, contenido estatico por ahora (a desarrollar mas adelante con contenido real,
// video o links). El objetivo de esta primera version es solo dejar el espacio del panel armado.
const TUTORIALES = [
  {
    titulo: "Primeros pasos en el simulador",
    descripcion: "Cómo usar el editor de código ISO y ejecutar tu primera simulación.",
    icon: PlayCircle,
  },
  {
    titulo: "Códigos G y M básicos",
    descripcion: "Referencia rápida de los códigos ISO más usados en torno y fresadora.",
    icon: BookOpen,
  },
  {
    titulo: "Cómo se califica un ejercicio",
    descripcion: "Qué revisa el sistema automáticamente y qué revisa tu instructor.",
    icon: ClipboardCheck,
  },
  {
    titulo: "Insignias y certificaciones",
    descripcion: "Cómo se obtienen las insignias por nivel y qué significa cada estado.",
    icon: Award,
  },
];

const NIVEL_LABEL = {
  TORNO_BASICO: "Torno Básico",
  TORNO_INTERMEDIO: "Torno Intermedio",
  FRESADO: "Fresado",
};

function formatFecha(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString();
}

export default function Dashboard() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const esAprendiz = usuario?.rol === "APRENDIZ";

  const [resumen, setResumen] = useState(null);
  const [porVencer, setPorVencer] = useState([]);
  const [actividad, setActividad] = useState(null);
  const [insignias, setInsignias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!usuario) return;
    setCargando(true);
    setError(null);
    // Un APRENDIZ no tiene permiso para /reportes/dashboard ni /certificaciones/por-vencer (son
    // agregados de toda la operacion, ver SecurityConfig) -- llamarlos igual solo generaba un 403
    // que este dashboard mostraba como "no se pudo cargar", un mensaje enganoso. Se separa por rol:
    // el APRENDIZ carga su propia actividad e insignias en su lugar.
    if (esAprendiz) {
      Promise.all([
        api.get(`/reportes/actividad/usuario/${usuario.id}`),
        api.get(`/reportes/insignias/usuario/${usuario.id}`),
      ])
        .then(([actividadRes, insigniasRes]) => {
          setActividad(actividadRes.data);
          setInsignias(insigniasRes.data);
        })
        .catch(() => setError("No se pudo cargar tu actividad. ¿Está corriendo el backend en :8081?"))
        .finally(() => setCargando(false));
    } else {
      Promise.all([api.get("/reportes/dashboard"), api.get("/reportes/certificaciones/por-vencer")])
        .then(([resumenRes, porVencerRes]) => {
          setResumen(resumenRes.data);
          setPorVencer(porVencerRes.data);
        })
        .catch(() => setError("No se pudo cargar el resumen. ¿Está corriendo el backend en :8081?"))
        .finally(() => setCargando(false));
    }
  }, [usuario, esAprendiz]);

  return (
    <PageLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-display-lg font-display-lg text-on-surface">Welcome, {usuario?.nombre?.split(" ")[0]}</h1>
          <p className="text-body-lg font-body-lg text-on-surface-variant mt-2 flex items-center gap-2">
            <BadgeCheck size={18} className="text-secondary" />
            {usuario?.rol}
          </p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          {(usuario?.rol === "ADMINISTRADOR" || usuario?.rol === "INSTRUCTOR") && (
            <button
              onClick={() => navigate("/instruccion")}
              className="flex-1 md:flex-none bg-surface-container-high hover:bg-surface-bright border border-outline-variant text-on-surface px-6 py-3 rounded text-label-sm font-label-sm tracking-wider uppercase transition-colors flex items-center justify-center gap-2"
            >
              <SlidersHorizontal size={16} />
              Gestión de instrucción
            </button>
          )}
          <button
            onClick={() => navigate("/simulador")}
            className="flex-1 md:flex-none bg-primary hover:bg-primary-fixed border border-primary text-on-primary px-6 py-3 rounded text-label-sm font-label-sm tracking-wider uppercase font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(131,207,255,0.2)]"
          >
            <Code2 size={16} />
            Ir al simulador
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded bg-error-container/20 text-error text-sm px-4 py-3 border border-error/40">
          {error}
        </div>
      )}

      {cargando ? (
        <p className="text-on-surface-variant text-sm">Cargando…</p>
      ) : esAprendiz ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          {/* Tutoriales: tarjetas simples, contenido a desarrollar mas adelante */}
          <section className="lg:col-span-8 flex flex-col gap-gutter">
            <h2 className="text-headline-md font-headline-md text-on-surface flex items-center gap-2">
              <PlayCircle size={20} className="text-primary" />
              Tutoriales
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-gutter">
              {TUTORIALES.map(({ titulo, descripcion, icon: Icon }) => (
                <div
                  key={titulo}
                  className="bg-surface-container border border-outline-variant rounded p-5 flex flex-col gap-3"
                >
                  <div className="text-primary bg-surface-container-highest rounded p-3 border border-outline-variant w-fit">
                    <Icon size={22} />
                  </div>
                  <div>
                    <h3 className="text-body-md font-body-md font-semibold text-on-surface">{titulo}</h3>
                    <p className="text-label-sm font-label-sm text-on-surface-variant mt-1">{descripcion}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Insignias: version resumida de MisCertificados.jsx */}
            <h2 className="text-headline-md font-headline-md text-on-surface flex items-center gap-2 mt-2">
              <Award size={20} className="text-primary" />
              Mis insignias
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-gutter">
              {insignias.map((insignia) => {
                const pct = Math.min(100, Math.round((insignia.aprobados / insignia.requeridos) * 100));
                return (
                  <button
                    key={insignia.nivel}
                    onClick={() => navigate("/mis-certificados")}
                    className="text-left bg-surface-container border border-outline-variant rounded p-4 flex flex-col gap-2 hover:bg-surface-container-high transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-body-md font-body-md text-on-surface">
                        {NIVEL_LABEL[insignia.nivel] || insignia.nivel}
                      </span>
                      {insignia.completado ? (
                        <ShieldCheck size={16} className="text-primary" />
                      ) : (
                        <Lock size={14} className="text-on-surface-variant" />
                      )}
                    </div>
                    <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${insignia.completado ? "bg-primary" : "bg-secondary"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-label-sm font-label-sm text-on-surface-variant">
                      {insignia.aprobados} / {insignia.requeridos}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Actividad en la plataforma */}
          <aside className="lg:col-span-4 flex flex-col gap-gutter">
            <div className="bg-surface-container border border-outline-variant rounded flex flex-col h-full">
              <div className="p-4 border-b border-outline-variant flex items-center gap-2 bg-surface-container-low">
                <Clock size={18} className="text-primary" />
                <h2 className="text-headline-md font-headline-md text-on-surface">Tu actividad</h2>
              </div>
              <div className="p-4 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="text-primary bg-surface-container-highest rounded p-2.5 border border-outline-variant">
                    <BadgeCheck size={18} />
                  </div>
                  <div>
                    <p className="text-body-md font-body-md text-on-surface">{formatFecha(actividad?.fechaCreacion)}</p>
                    <p className="text-label-sm font-label-sm text-on-surface-variant">Miembro desde</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-secondary bg-surface-container-highest rounded p-2.5 border border-outline-variant">
                    <Send size={18} />
                  </div>
                  <div>
                    <p className="text-body-md font-body-md text-on-surface">{actividad?.totalIntentos ?? 0}</p>
                    <p className="text-label-sm font-label-sm text-on-surface-variant">Intentos enviados</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-outline bg-surface-container-highest rounded p-2.5 border border-outline-variant">
                    <Activity size={18} />
                  </div>
                  <div>
                    <p className="text-body-md font-body-md text-on-surface">
                      {actividad?.ultimoIntento ? formatFecha(actividad.ultimoIntento) : "Sin actividad aún"}
                    </p>
                    <p className="text-label-sm font-label-sm text-on-surface-variant">Último intento enviado</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          {/* Stat cards */}
          <section className="lg:col-span-8 flex flex-col gap-gutter">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-gutter">
              {tarjetas.map(({ key, label, icon: Icon, accent }) => (
                <div
                  key={key}
                  className="bg-surface-container border border-outline-variant rounded p-5 flex items-center gap-4 relative overflow-hidden"
                >
                  <div className={`${accent} bg-surface-container-highest rounded p-3 border border-outline-variant`}>
                    <Icon size={22} />
                  </div>
                  <div>
                    <p className="text-headline-lg font-headline-lg text-on-surface">{resumen?.[key] ?? 0}</p>
                    <p className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mt-1">
                      {label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Certifications widget */}
          <aside className="lg:col-span-4 flex flex-col gap-gutter">
            <div className="bg-surface-container border border-outline-variant rounded flex flex-col h-full">
              <div className="p-4 border-b border-outline-variant flex items-center gap-2 bg-surface-container-low">
                <BadgeCheck size={18} className="text-primary" />
                <h2 className="text-headline-md font-headline-md text-on-surface">Certificaciones por vencer</h2>
              </div>
              <div className="p-4 flex flex-col gap-3">
                {porVencer.length === 0 && (
                  <p className="text-label-sm font-label-sm text-on-surface-variant">
                    No hay certificaciones próximas a vencer.
                  </p>
                )}
                {porVencer.map((c) => (
                  <div
                    key={c.id}
                    className="bg-[#331100] border border-secondary-container rounded p-4 flex items-start gap-3 shadow-[inset_0_0_0_1px_rgba(237,144,0,0.5)]"
                  >
                    <AlertTriangle size={18} className="text-secondary-container mt-1 shrink-0" />
                    <div>
                      <h4 className="text-body-md font-body-md font-semibold text-secondary-fixed">
                        {c.usuario?.nombre}
                      </h4>
                      <p className="text-code-md font-code-md text-secondary-fixed-dim mt-1">
                        Vence el {c.fechaVencimiento}
                      </p>
                    </div>
                  </div>
                ))}
                {resumen?.certificacionesVigentes > 0 && (
                  <div className="bg-surface-container-highest border border-outline-variant rounded p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ShieldCheck size={26} className="text-outline" />
                      <div>
                        <div className="text-body-md font-body-md text-on-surface">
                          {resumen.certificacionesVigentes} certificaciones vigentes
                        </div>
                        <div className="text-label-sm font-label-sm text-outline mt-1">Al día</div>
                      </div>
                    </div>
                    <button className="text-primary hover:text-primary-fixed" aria-label="Descargar reporte">
                      <Download size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </PageLayout>
  );
}
