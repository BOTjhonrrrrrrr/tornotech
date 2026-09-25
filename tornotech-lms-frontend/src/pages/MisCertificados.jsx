import { useEffect, useState } from "react";
import { Award, Printer, ShieldCheck, ShieldAlert, ShieldX, Lock } from "lucide-react";
import PageLayout from "../components/layout/PageLayout.jsx";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

// RF-15/RF-16 (rediseñado a insignias por nivel): ya no se emite un certificado por cada
// ejercicio aprobado, sino una insignia por nivel (Torno Básico/Intermedio, Fresado) al completar
// 10 ejercicios distintos de ese nivel -- ver EvaluacionService.progresoInsignias en el backend.
// El backend ya valida que solo puedas ver LAS TUYAS salvo que tengas rol de supervision
// (ver ReporteController.verificarAccesoUsuario / UsuarioActualService).

const NIVEL_LABEL = {
  TORNO_BASICO: "Torno Básico",
  TORNO_INTERMEDIO: "Torno Intermedio",
  FRESADO: "Fresado",
};

const BADGE_ESTADO = {
  VIGENTE: { color: "border-primary text-primary", icon: ShieldCheck, label: "Vigente" },
  POR_VENCER: { color: "border-secondary text-secondary", icon: ShieldAlert, label: "Por vencer" },
  VENCIDA: { color: "border-error text-error", icon: ShieldX, label: "Vencida" },
};

// El campo "estado" que guarda el backend se fija en VIGENTE al emitir y no se actualiza solo con
// el paso del tiempo (no hay un job programado) -- se recalcula aca a partir de la fecha, como ya
// hace ReporteService.resumenDashboard() para el widget del Dashboard.
function estadoPorFecha(fechaVencimientoIso) {
  if (!fechaVencimientoIso) return "VIGENTE";
  const hoy = new Date();
  const vence = new Date(fechaVencimientoIso);
  const diasRestantes = (vence - hoy) / (1000 * 60 * 60 * 24);
  if (diasRestantes < 0) return "VENCIDA";
  if (diasRestantes < 30) return "POR_VENCER";
  return "VIGENTE";
}

export default function MisCertificados() {
  const { usuario } = useAuth();
  const [insignias, setInsignias] = useState([]);
  const [certificadosAnteriores, setCertificadosAnteriores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [paraImprimir, setParaImprimir] = useState(null);

  useEffect(() => {
    if (!usuario) return;
    setErrorCarga(null);
    Promise.all([
      api.get(`/reportes/insignias/usuario/${usuario.id}`),
      api.get(`/reportes/certificaciones/usuario/${usuario.id}`),
    ])
      .then(([insigniasRes, certsRes]) => {
        setInsignias(insigniasRes.data);
        // Certificados emitidos ANTES de este cambio (uno por ejercicio aprobado) quedaron con
        // nivel = null -- se siguen mostrando, pero aparte de las insignias nuevas.
        setCertificadosAnteriores(certsRes.data.filter((c) => !c.nivel));
      })
      .catch(() => setErrorCarga("No se pudieron cargar tus certificaciones."))
      .finally(() => setCargando(false));
  }, [usuario]);

  useEffect(() => {
    if (!paraImprimir) return;
    // Deja que el overlay se pinte antes de abrir el dialogo de impresion del navegador.
    const id = setTimeout(() => window.print(), 50);
    const limpiar = () => setParaImprimir(null);
    window.addEventListener("afterprint", limpiar);
    return () => {
      clearTimeout(id);
      window.removeEventListener("afterprint", limpiar);
    };
  }, [paraImprimir]);

  return (
    <>
      <div className="print:hidden">
        <PageLayout>
          <div className="mb-6">
            <h1 className="text-headline-lg font-headline-lg text-on-surface mb-1 flex items-center gap-2">
              <Award size={24} className="text-primary" />
              Mis certificados
            </h1>
            <p className="text-on-surface-variant text-body-md font-body-md">
              Insignias por nivel: se emiten al completar 10 ejercicios aprobados de esa categoría.
            </p>
          </div>

          {errorCarga && (
            <div className="mb-4 rounded bg-error-container/20 text-error text-sm px-4 py-3 border border-error/40">
              {errorCarga}
            </div>
          )}

          {cargando && <p className="text-on-surface-variant text-sm">Cargando…</p>}

          {!cargando && !errorCarga && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter mb-8">
              {insignias.map((insignia) => {
                const estado = insignia.completado ? estadoPorFecha(insignia.fechaVencimiento) : null;
                const badge = estado ? BADGE_ESTADO[estado] : null;
                const BadgeIcon = badge?.icon;
                const progresoPct = Math.min(100, Math.round((insignia.aprobados / insignia.requeridos) * 100));

                return (
                  <div
                    key={insignia.nivel}
                    className="bg-surface-container-low border border-outline-variant rounded p-5 flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-headline-sm font-headline-md text-on-surface leading-tight">
                        {NIVEL_LABEL[insignia.nivel] || insignia.nivel}
                      </h3>
                      {insignia.completado ? (
                        <span
                          className={`shrink-0 flex items-center gap-1 px-2 py-0.5 bg-surface-container-highest border rounded text-label-sm ${badge.color}`}
                        >
                          <BadgeIcon size={12} />
                          {badge.label}
                        </span>
                      ) : (
                        <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 bg-surface-container-highest border border-outline-variant rounded text-label-sm text-on-surface-variant">
                          <Lock size={12} />
                          En progreso
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between text-label-sm font-label-sm text-on-surface-variant mb-1">
                        <span>{insignia.aprobados} / {insignia.requeridos} ejercicios aprobados</span>
                        <span>{progresoPct}%</span>
                      </div>
                      <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${insignia.completado ? "bg-primary" : "bg-secondary"}`}
                          style={{ width: `${progresoPct}%` }}
                        />
                      </div>
                    </div>

                    {insignia.completado ? (
                      <>
                        <div className="text-body-md font-body-md text-on-surface-variant flex flex-col gap-1">
                          <span>Emitida: {insignia.fechaEmision}</span>
                          <span>Vence: {insignia.fechaVencimiento}</span>
                        </div>
                        <button
                          onClick={() => setParaImprimir({ tipo: "insignia", ...insignia })}
                          className="mt-1 flex items-center justify-center gap-2 px-4 py-2 rounded text-label-sm font-label-sm font-bold uppercase tracking-wider bg-primary text-on-primary hover:bg-primary-fixed-dim transition-colors"
                        >
                          <Printer size={14} />
                          Imprimir constancia
                        </button>
                      </>
                    ) : (
                      <p className="text-label-sm font-label-sm text-on-surface-variant">
                        Te faltan {insignia.requeridos - insignia.aprobados} ejercicios de esta categoría.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!cargando && !errorCarga && certificadosAnteriores.length > 0 && (
            <div>
              <h2 className="text-headline-sm font-headline-md text-on-surface-variant mb-3">
                Certificados anteriores (por ejercicio individual)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
                {certificadosAnteriores.map((c) => {
                  const estado = estadoPorFecha(c.fechaVencimiento);
                  const badge = BADGE_ESTADO[estado];
                  const BadgeIcon = badge.icon;
                  const ej = c.evaluacion?.intento?.ejercicio;
                  return (
                    <div
                      key={c.id}
                      className="bg-surface-container-low border border-outline-variant rounded p-5 flex flex-col gap-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-headline-sm font-headline-md text-on-surface leading-tight">
                          {ej?.titulo || "Ejercicio"}
                        </h3>
                        <span
                          className={`shrink-0 flex items-center gap-1 px-2 py-0.5 bg-surface-container-highest border rounded text-label-sm ${badge.color}`}
                        >
                          <BadgeIcon size={12} />
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">
                        {ej?.maquina?.replace("_", " ")}
                      </p>
                      <div className="text-body-md font-body-md text-on-surface-variant flex flex-col gap-1">
                        <span>Emitida: {c.fechaEmision}</span>
                        <span>Vence: {c.fechaVencimiento}</span>
                      </div>
                      <button
                        onClick={() => setParaImprimir({ tipo: "legacy", ...c })}
                        className="mt-1 flex items-center justify-center gap-2 px-4 py-2 rounded text-label-sm font-label-sm font-bold uppercase tracking-wider bg-primary text-on-primary hover:bg-primary-fixed-dim transition-colors"
                      >
                        <Printer size={14} />
                        Imprimir constancia
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </PageLayout>
      </div>

      {/* Plantilla de impresion: oculta en pantalla, solo visible dentro del dialogo de impresion
          del navegador (window.print). Evita traer una libreria de PDF que no puedo compilar/verificar
          en este entorno -- "imprimir a PDF" desde el navegador cubre el mismo caso de uso. */}
      {paraImprimir && (
        <div className="hidden print:flex fixed inset-0 bg-white text-[#111] flex-col items-center justify-center p-16">
          <div className="border-4 border-[#1a1a1a] w-full max-w-2xl p-12 flex flex-col items-center text-center gap-4">
            <p className="uppercase tracking-[0.3em] text-sm text-[#555]">TornoTech · Precision LMS</p>
            <h1 className="text-4xl font-bold mt-2">Constancia de Aprobación</h1>
            <p className="text-lg mt-6">Se certifica que</p>
            <p className="text-2xl font-bold">{usuario?.nombre}</p>
            {paraImprimir.tipo === "insignia" ? (
              <>
                <p className="text-lg">completó satisfactoriamente el nivel</p>
                <p className="text-2xl font-semibold">{NIVEL_LABEL[paraImprimir.nivel] || paraImprimir.nivel}</p>
                <p className="text-base text-[#555] uppercase tracking-wider">
                  {paraImprimir.requeridos} ejercicios aprobados
                </p>
              </>
            ) : (
              <>
                <p className="text-lg">completó satisfactoriamente el ejercicio</p>
                <p className="text-2xl font-semibold">{paraImprimir.evaluacion?.intento?.ejercicio?.titulo}</p>
                <p className="text-base text-[#555] uppercase tracking-wider">
                  {paraImprimir.evaluacion?.intento?.ejercicio?.maquina?.replace("_", " ")}
                </p>
              </>
            )}
            <div className="flex gap-12 mt-8 text-sm text-[#555]">
              <div>
                <p className="uppercase tracking-wider">Fecha de emisión</p>
                <p className="text-base text-[#111] font-semibold">{paraImprimir.fechaEmision}</p>
              </div>
              <div>
                <p className="uppercase tracking-wider">Vigente hasta</p>
                <p className="text-base text-[#111] font-semibold">{paraImprimir.fechaVencimiento}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
