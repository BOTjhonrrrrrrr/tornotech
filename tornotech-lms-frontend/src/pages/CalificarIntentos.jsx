import { useEffect, useState } from "react";
import { ClipboardCheck, Inbox, History, User, Clock, AlertTriangle, Check, X, MessageSquare, Sparkles } from "lucide-react";
import PageLayout from "../components/layout/PageLayout.jsx";
import CodeEditor from "../components/simulador/CodeEditor.jsx";
import TrayectoriaCanvas from "../components/simulador/TrayectoriaCanvas.jsx";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

// RF-14: pantalla para que el instructor revise el codigo + trayectoria de cada intento y lo
// apruebe o rechace. ValidacionService ya corre automaticamente sobre cada intento (colision/
// sintaxis, dimension dentro de tolerancia, codigos/estrategia esperada -- solo si el ejercicio
// define esos criterios) y aparece aqui como "Sugerencia del sistema"; el instructor sigue
// teniendo la ultima palabra en todos los casos salvo APROBADO, que se certifica automaticamente
// (ver ValidacionService e IntentoService) y por eso ya no aparece en "Pendientes".

const BADGE_ESTADO = {
  APROBADO: "border-primary text-primary",
  REPROBADO: "border-error text-error",
  PENDIENTE: "border-secondary text-secondary",
};

const BADGE_AUTOMATICO = {
  APROBADO: "border-primary text-primary",
  RECHAZADO: "border-error text-error",
  PENDIENTE_REVISION: "border-secondary text-secondary",
};

function formatFecha(fechaIso) {
  if (!fechaIso) return "—";
  return new Date(fechaIso).toLocaleString();
}

function parseJson(texto) {
  try {
    return JSON.parse(texto || "[]");
  } catch {
    return [];
  }
}

export default function CalificarIntentos() {
  const { usuario } = useAuth();
  const [tab, setTab] = useState("pendientes");
  const [pendientes, setPendientes] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [seleccionId, setSeleccionId] = useState(null);
  const [comentarios, setComentarios] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);

  function cargar() {
    setCargando(true);
    setErrorCarga(null);
    Promise.all([api.get("/evaluaciones/pendientes"), api.get("/evaluaciones/historial")])
      .then(([p, h]) => {
        setPendientes(p.data);
        setHistorial(h.data);
      })
      .catch(() => setErrorCarga("No se pudo cargar la lista de intentos."))
      .finally(() => setCargando(false));
  }

  useEffect(cargar, []);

  const lista = tab === "pendientes" ? pendientes : historial;
  const seleccionado = lista.find((item) => item.intentoId === seleccionId);
  const trayectoria = seleccionado ? parseJson(seleccionado.trayectoria2D) : [];
  const errores = seleccionado ? parseJson(seleccionado.errores) : [];
  const lineasConError = errores.map((e) => e.linea).filter(Boolean);
  const detalleValidacion = seleccionado?.detalleValidacion ? parseJson(seleccionado.detalleValidacion) : null;

  function seleccionar(id) {
    setSeleccionId(id);
    setComentarios("");
  }

  async function calificar(estado) {
    if (!seleccionado || !usuario) return;
    setEnviando(true);
    try {
      await api.post("/evaluaciones/calificar", {
        intentoId: seleccionado.intentoId,
        calificadoPorId: usuario.id,
        estado,
        comentarios,
      });
      setSeleccionId(null);
      setComentarios("");
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
            <ClipboardCheck size={24} className="text-primary" />
            Calificación de intentos
          </h1>
          <p className="text-on-surface-variant text-body-md font-body-md">
            Revisa el código enviado por cada empleado y aprueba o rechaza el intento.
          </p>
        </div>
      </div>

      {errorCarga && (
        <div className="mb-4 rounded bg-error-container/20 text-error text-sm px-4 py-3 border border-error/40">
          {errorCarga}
        </div>
      )}

      <div className="flex gap-2 mb-gutter">
        <button
          onClick={() => {
            setTab("pendientes");
            setSeleccionId(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded text-label-sm font-label-sm uppercase tracking-wider transition-colors ${
            tab === "pendientes"
              ? "bg-primary text-on-primary"
              : "bg-surface-container border border-outline-variant text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <Inbox size={16} />
          Pendientes ({pendientes.length})
        </button>
        <button
          onClick={() => {
            setTab("historial");
            setSeleccionId(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded text-label-sm font-label-sm uppercase tracking-wider transition-colors ${
            tab === "historial"
              ? "bg-primary text-on-primary"
              : "bg-surface-container border border-outline-variant text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <History size={16} />
          Historial ({historial.length})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Lista */}
        <div className="lg:col-span-4 bg-surface-container-low border border-outline-variant rounded flex flex-col max-h-[70vh] overflow-y-auto">
          {cargando && <p className="p-4 text-on-surface-variant text-sm">Cargando…</p>}
          {!cargando && lista.length === 0 && (
            <p className="p-4 text-on-surface-variant text-sm">
              {tab === "pendientes" ? "No hay intentos pendientes de calificar." : "Aún no hay intentos calificados."}
            </p>
          )}
          {lista.map((item) => {
            const erroresItem = parseJson(item.errores);
            return (
              <button
                key={item.intentoId}
                onClick={() => seleccionar(item.intentoId)}
                className={`text-left p-3 border-b border-outline-variant last:border-0 transition-colors ${
                  seleccionId === item.intentoId ? "bg-surface-container-high" : "hover:bg-surface-container-high"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-body-md font-body-md text-on-surface font-semibold flex items-center gap-1.5">
                    <User size={14} className="text-outline" />
                    {item.usuarioNombre}
                  </span>
                  {tab === "historial" && (
                    <span
                      className={`px-2 py-0.5 bg-surface-container-highest border rounded text-label-sm ${
                        BADGE_ESTADO[item.estadoEvaluacion] || ""
                      }`}
                    >
                      {item.estadoEvaluacion}
                    </span>
                  )}
                </div>
                <p className="text-label-sm font-label-sm text-on-surface-variant mt-1">{item.ejercicioTitulo}</p>
                <div className="flex items-center gap-3 mt-1.5 text-label-sm font-label-sm text-outline">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {formatFecha(item.fechaEnvio)}
                  </span>
                  {item.colisionDetectada && (
                    <span className="flex items-center gap-1 text-error">
                      <AlertTriangle size={12} />
                      colisión
                    </span>
                  )}
                  {erroresItem.length > 0 && <span className="text-secondary-container">{erroresItem.length} advertencias</span>}
                  {tab === "pendientes" && item.resultadoAutomatico && (
                    <span className={`flex items-center gap-1 ${BADGE_AUTOMATICO[item.resultadoAutomatico]?.split(" ")[1] || ""}`}>
                      <Sparkles size={12} />
                      {item.resultadoAutomatico.replace("_", " ")}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Detalle */}
        <div className="lg:col-span-8 bg-surface-container-low border border-outline-variant rounded flex flex-col min-h-[70vh]">
          {!seleccionado ? (
            <div className="flex-1 flex items-center justify-center text-on-surface-variant text-sm">
              Selecciona un intento de la lista para revisarlo.
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-outline-variant flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-headline-md font-headline-md text-on-surface">{seleccionado.ejercicioTitulo}</h2>
                  <p className="text-label-sm font-label-sm text-on-surface-variant mt-1">
                    {seleccionado.usuarioNombre} · {seleccionado.usuarioEmail} · {seleccionado.maquina?.replace("_", " ")}
                  </p>
                </div>
                {tab === "historial" && (
                  <span
                    className={`px-3 py-1 bg-surface-container-highest border rounded text-label-sm font-label-sm shrink-0 ${
                      BADGE_ESTADO[seleccionado.estadoEvaluacion] || ""
                    }`}
                  >
                    {seleccionado.estadoEvaluacion}
                  </span>
                )}
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 min-h-[360px]">
                <div className="border-r border-outline-variant flex flex-col min-h-[300px]">
                  <CodeEditor value={seleccionado.codigoIso} onChange={() => {}} lineasConError={lineasConError} readOnly />
                </div>
                <div className="relative min-h-[300px] bg-surface-container-lowest">
                  <TrayectoriaCanvas
                    segmentos={trayectoria}
                    colisionDetectada={seleccionado.colisionDetectada}
                    esTorno={seleccionado.maquina === "TORNO_CNC"}
                  />
                </div>
              </div>

              {errores.length > 0 && (
                <div className="p-3 border-t border-outline-variant bg-surface-container max-h-32 overflow-y-auto flex flex-col gap-1">
                  {errores.map((e, i) => (
                    <p key={i} className="text-label-sm font-label-sm text-on-surface-variant">
                      <span className="text-error font-semibold">Línea {e.linea} ({e.tipo}):</span> {e.mensaje}
                    </p>
                  ))}
                </div>
              )}

              {seleccionado.resultadoAutomatico && (
                <div className="p-3 border-t border-outline-variant bg-surface-container-low flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-primary" />
                    <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">
                      Sugerencia del sistema
                    </span>
                    <span
                      className={`px-2 py-0.5 bg-surface-container-highest border rounded text-label-sm ${
                        BADGE_AUTOMATICO[seleccionado.resultadoAutomatico] || ""
                      }`}
                    >
                      {seleccionado.resultadoAutomatico.replace("_", " ")}
                    </span>
                  </div>
                  {detalleValidacion?.mensajes?.length > 0 && (
                    <ul className="text-label-sm font-label-sm text-on-surface-variant list-disc list-inside">
                      {detalleValidacion.mensajes.map((mensaje, i) => (
                        <li key={i}>{mensaje}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {tab === "pendientes" ? (
                <div className="p-4 border-t border-outline-variant flex flex-col gap-3">
                  <label className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare size={14} />
                    Comentarios (opcional)
                  </label>
                  <textarea
                    value={comentarios}
                    onChange={(e) => setComentarios(e.target.value)}
                    rows={2}
                    className="w-full bg-surface-container-highest border border-outline-variant text-on-surface rounded px-3 py-2 text-sm focus:border-primary outline-none resize-none"
                    placeholder="Ej: Buen uso de G02/G03, revisar el avance en la línea 6."
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => calificar("REPROBADO")}
                      disabled={enviando}
                      className="flex items-center gap-2 px-4 py-2 rounded text-label-sm font-label-sm font-bold uppercase tracking-wider bg-error/10 text-error border border-error/40 hover:bg-error/20 transition-colors disabled:opacity-50"
                    >
                      <X size={16} />
                      Reprobar
                    </button>
                    <button
                      onClick={() => calificar("APROBADO")}
                      disabled={enviando}
                      className="flex items-center gap-2 px-4 py-2 rounded text-label-sm font-label-sm font-bold uppercase tracking-wider bg-primary text-on-primary hover:bg-primary-fixed-dim transition-colors disabled:opacity-50"
                    >
                      <Check size={16} />
                      Aprobar
                    </button>
                  </div>
                </div>
              ) : (
                seleccionado.comentarios && (
                  <div className="p-4 border-t border-outline-variant">
                    <p className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Comentarios</p>
                    <p className="text-body-md font-body-md text-on-surface">{seleccionado.comentarios}</p>
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
