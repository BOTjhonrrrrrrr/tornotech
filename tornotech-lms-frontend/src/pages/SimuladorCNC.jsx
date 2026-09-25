import { useEffect, useState } from "react";
import { ChevronRight, ListChecks, Play, Square, Pause, AlertTriangle, ZoomIn, ZoomOut, Ruler, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import PageLayout from "../components/layout/PageLayout.jsx";
import TrayectoriaCanvas from "../components/simulador/TrayectoriaCanvas.jsx";
import PlanoTecnico from "../components/simulador/PlanoTecnico.jsx";
import CodeEditor from "../components/simulador/CodeEditor.jsx";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

const CODIGO_EJEMPLO = `G90
G00 X0 Z0
G01 X20 Z-50
G01 X40 Z-80
G00 X0 Z0`;

export default function SimuladorCNC() {
  const { usuario } = useAuth();
  const [ejercicios, setEjercicios] = useState([]);
  const [ejercicioId, setEjercicioId] = useState("");
  const [codigo, setCodigo] = useState(CODIGO_EJEMPLO);
  const [resultado, setResultado] = useState(null);
  const [ejecutando, setEjecutando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // Panel izquierdo (editor + plano) colapsable: en pantallas angostas o cuando el alumno solo
  // quiere ver el canvas 2D grande, puede ocultarlo y el canvas toma todo el ancho disponible.
  const [panelVisible, setPanelVisible] = useState(true);

  // Pieza en bruto (RF-09/RF-10): dimensiones editables manualmente para previsualizar limites y
  // colision en el simulador. No modifican la pieza real asignada al ejercicio ni afectan el
  // resultado guardado al "Execute Simulation", que siempre valida contra la pieza oficial.
  const [stockDiametro, setStockDiametro] = useState("50");
  const [stockLongitud, setStockLongitud] = useState("150");
  const [stockAncho, setStockAncho] = useState("80");
  const [stockAlto, setStockAlto] = useState("80");

  // RF-06: un APRENDIZ solo ve los ejercicios que le asignaron (directo o por su grupo);
  // Admin/Instructor siguen viendo la biblioteca completa porque necesitan poder probar cualquiera.
  const [errorEjercicios, setErrorEjercicios] = useState(null);
  useEffect(() => {
    if (!usuario) return;
    setErrorEjercicios(null);
    const ruta = usuario.rol === "APRENDIZ" ? `/ejercicios/asignados/${usuario.id}` : "/ejercicios";
    api
      .get(ruta)
      .then((res) => {
        setEjercicios(res.data);
        if (res.data.length > 0) setEjercicioId(res.data[0].id);
      })
      .catch((err) => {
        // Antes esto fallaba en silencio y el usuario solo veia "no tienes ejercicios asignados"
        // aunque la causa real fuera otra (permiso, error de servidor, etc.) -- ahora se distingue.
        setEjercicios([]);
        setErrorEjercicios(err.response?.data?.error || "No se pudo cargar la lista de ejercicios.");
      });
  }, [usuario]);

  const ejercicioActual = ejercicios.find((e) => String(e.id) === String(ejercicioId));
  const esTorno = ejercicioActual?.maquina === "TORNO_CNC";

  // Plano de referencia (estatico): geometria calculada server-side a partir del codigo solucion
  // del instructor (ver EjercicioController.plano). Cambia solo con el ejercicio, no con lo que
  // el alumno escribe -- por eso vive en su propio efecto, separado de validar()/resultado.
  const [plano, setPlano] = useState(null);
  const [cargandoPlano, setCargandoPlano] = useState(false);

  useEffect(() => {
    if (!ejercicioId) {
      setPlano(null);
      return;
    }
    setCargandoPlano(true);
    api
      .get(`/ejercicios/${ejercicioId}/plano`)
      .then((res) => setPlano(res.data))
      .catch(() => setPlano(null))
      .finally(() => setCargandoPlano(false));
  }, [ejercicioId]);

  // Al cambiar de ejercicio, se precargan las dimensiones de la pieza en bruto desde la pieza
  // real asignada (si tiene parametrosGeneracion), como punto de partida editable.
  useEffect(() => {
    if (!ejercicioActual?.pieza?.parametrosGeneracion) return;
    try {
      const params = JSON.parse(ejercicioActual.pieza.parametrosGeneracion);
      if (esTorno) {
        if (params.diametro) setStockDiametro(String(params.diametro));
        if (params.longitud) setStockLongitud(String(params.longitud));
      } else {
        if (params.ancho) setStockAncho(String(params.ancho));
        if (params.alto) setStockAlto(String(params.alto));
      }
    } catch {
      // parametrosGeneracion ausente o no parseable: se mantienen los valores actuales
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ejercicioId]);

  // RF-11: feedback en tiempo real al ejecutar/validar. Se dispara manualmente con "Validate Code";
  // para feedback verdaderamente "mientras se escribe" agregar un debounce sobre onChange.
  async function validar() {
    if (!ejercicioId) return;
    setEjecutando(true);
    try {
      const { data } = await api.post("/simulacion/ejecutar", {
        ejercicioId,
        codigoIso: codigo,
        stockDiametro: esTorno ? Number(stockDiametro) || undefined : undefined,
        stockLongitud: esTorno ? Number(stockLongitud) || undefined : undefined,
        stockAncho: !esTorno ? Number(stockAncho) || undefined : undefined,
        stockAlto: !esTorno ? Number(stockAlto) || undefined : undefined,
      });
      setResultado(data);
    } finally {
      setEjecutando(false);
    }
  }

  async function ejecutarSimulacion() {
    setEnviando(true);
    try {
      await validar();
      await api.post("/intentos", { usuarioId: usuario.id, ejercicioId, codigoIso: codigo });
    } finally {
      setEnviando(false);
    }
  }

  const ultimoPunto = resultado?.trayectoria?.length ? resultado.trayectoria[resultado.trayectoria.length - 1] : null;
  const lineasConError = resultado?.errores?.map((e) => e.linea) ?? [];
  const primerError = resultado?.errores?.[0];

  return (
    <PageLayout>
      {/* overflow-hidden aca: nada dentro de este flex-col puede empujarlo mas alla del alto del
          viewport (h-[calc(100vh-4rem)]). Sin esto, si el breadcrumb o el banner de error crecen
          (texto largo, wrap a 2 lineas), el footer con los botones de ejecucion se corre fuera de
          la pantalla y hay que hacer scroll para verlo. */}
      <div className="flex flex-col h-[calc(100vh-4rem)] -m-margin overflow-hidden">
        {/* Breadcrumb / context header */}
        <div className="px-margin py-3 border-b border-outline-variant bg-surface flex flex-wrap items-center gap-2 justify-between shrink-0">
          <div className="flex items-center gap-2 text-label-sm font-label-sm text-on-surface-variant">
            <span>Exercises</span>
            <ChevronRight size={14} />
            <span>{ejercicioActual?.maquina?.replace("_", " ") ?? "—"}</span>
            <ChevronRight size={14} />
            <span className="text-on-surface font-semibold">{ejercicioActual?.titulo ?? "Selecciona un ejercicio"}</span>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="bg-surface-container-highest border border-outline-variant text-on-surface text-label-sm font-label-sm rounded px-3 py-1.5 focus:border-primary outline-none"
              value={ejercicioId}
              onChange={(e) => {
                setEjercicioId(e.target.value);
                setResultado(null);
              }}
            >
              {ejercicios.map((ej) => (
                <option key={ej.id} value={ej.id}>
                  {ej.titulo}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-container rounded-full border border-outline-variant text-label-sm font-label-sm text-primary">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Simulation Ready
            </div>
          </div>
        </div>

        {errorEjercicios && (
          <div className="px-margin py-3 bg-error-container/20 border-b border-error/40 text-error text-body-md font-body-md shrink-0 break-words">
            {errorEjercicios}
          </div>
        )}
        {!errorEjercicios && ejercicios.length === 0 && usuario?.rol === "APRENDIZ" && (
          <div className="px-margin py-3 bg-secondary-container/10 border-b border-secondary/40 text-secondary text-body-md font-body-md shrink-0">
            Todavía no tienes ejercicios asignados. Pídele a tu instructor que te asigne uno desde Gestión de instrucción.
          </div>
        )}

        {/* Dual pane workspace */}
        {/* min-h-0: por defecto un hijo flex no se encoge por debajo del alto de su contenido
            (min-height:auto), lo que podia forzar a este panel -y por lo tanto a la pagina- a ser
            mas alto que el viewport. min-h-0 permite que realmente ocupe solo el espacio restante. */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden relative">
          {/* LEFT: ISO code editor (colapsable) */}
          {panelVisible && (
          <section className="w-full lg:w-[30%] flex flex-col bg-surface-container-lowest border-r border-outline-variant z-10 shrink-0 min-h-0">
            <div className="px-4 py-3 border-b border-outline-variant flex justify-between items-center bg-surface-container shrink-0">
              <h2 className="text-body-md font-body-md font-semibold text-on-surface">ISO Code Editor</h2>
              <button
                onClick={validar}
                disabled={ejecutando || !ejercicioId}
                className="bg-primary hover:bg-primary-fixed-dim text-on-primary text-label-sm font-label-sm px-4 py-1.5 rounded flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <ListChecks size={16} />
                {ejecutando ? "Validando…" : "Validate Code"}
              </button>
            </div>

            {/* Pieza en bruto: dimensiones editables para previsualizar limites/colision */}
            <div className="px-4 py-2 border-b border-outline-variant bg-surface-container-low flex flex-wrap items-center gap-x-4 gap-y-1.5 shrink-0">
              <div className="flex items-center gap-1.5 text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">
                <Ruler size={14} className="text-outline" />
                Pieza en bruto
              </div>
              {esTorno ? (
                <>
                  <label className="flex items-center gap-1.5 text-label-sm font-label-sm text-on-surface-variant">
                    Ø
                    <input
                      type="number"
                      min="1"
                      step="0.5"
                      value={stockDiametro}
                      onChange={(e) => setStockDiametro(e.target.value)}
                      className="w-16 bg-surface-container-highest border border-outline-variant rounded px-1.5 py-0.5 text-on-surface text-label-sm font-label-sm outline-none focus:border-primary"
                    />
                    mm
                  </label>
                  <label className="flex items-center gap-1.5 text-label-sm font-label-sm text-on-surface-variant">
                    Long.
                    <input
                      type="number"
                      min="1"
                      step="0.5"
                      value={stockLongitud}
                      onChange={(e) => setStockLongitud(e.target.value)}
                      className="w-16 bg-surface-container-highest border border-outline-variant rounded px-1.5 py-0.5 text-on-surface text-label-sm font-label-sm outline-none focus:border-primary"
                    />
                    mm
                  </label>
                </>
              ) : (
                <>
                  <label className="flex items-center gap-1.5 text-label-sm font-label-sm text-on-surface-variant">
                    Ancho
                    <input
                      type="number"
                      min="1"
                      step="0.5"
                      value={stockAncho}
                      onChange={(e) => setStockAncho(e.target.value)}
                      className="w-16 bg-surface-container-highest border border-outline-variant rounded px-1.5 py-0.5 text-on-surface text-label-sm font-label-sm outline-none focus:border-primary"
                    />
                    mm
                  </label>
                  <label className="flex items-center gap-1.5 text-label-sm font-label-sm text-on-surface-variant">
                    Alto
                    <input
                      type="number"
                      min="1"
                      step="0.5"
                      value={stockAlto}
                      onChange={(e) => setStockAlto(e.target.value)}
                      className="w-16 bg-surface-container-highest border border-outline-variant rounded px-1.5 py-0.5 text-on-surface text-label-sm font-label-sm outline-none focus:border-primary"
                    />
                    mm
                  </label>
                </>
              )}
            </div>

            <CodeEditor value={codigo} onChange={setCodigo} lineasConError={lineasConError} />

            {/* Plano tecnico de referencia: panel fijo, siempre visible bajo el editor */}
            <div className="h-56 border-t border-outline-variant flex flex-col bg-surface-container-lowest shrink-0">
              <div className="px-4 py-2 border-b border-outline-variant flex items-center gap-2 bg-surface-container shrink-0">
                <Ruler size={14} className="text-outline" />
                <h3 className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">
                  Plano de referencia
                </h3>
              </div>
              <div className="flex-1 relative">
                {cargandoPlano ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-label-sm font-label-sm text-on-surface-variant">Cargando…</p>
                  </div>
                ) : plano?.disponible && plano.imagenBase64 ? (
                  <div className="absolute inset-0 flex items-center justify-center p-2 bg-surface">
                    <img
                      src={plano.imagenBase64}
                      alt="Plano de manufactura de la pieza"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : plano?.disponible ? (
                  <PlanoTecnico trayectoria={plano.simulacion?.trayectoria} esTorno={esTorno} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center px-4">
                    <p className="text-label-sm font-label-sm text-on-surface-variant text-center">
                      Tu instructor no definió un plano de referencia para este ejercicio.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
          )}

          {/* RIGHT: 2D simulation canvas */}
          <section className="flex-1 min-h-0 flex flex-col bg-surface-container-low relative">
            <div className="px-4 py-3 border-b border-outline-variant flex justify-between items-center bg-surface-container shrink-0 z-10">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPanelVisible((v) => !v)}
                  className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-bright transition-colors rounded border border-outline-variant"
                  title={panelVisible ? "Ocultar editor" : "Mostrar editor"}
                >
                  {panelVisible ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
                </button>
                <h2 className="text-body-md font-body-md font-semibold text-on-surface">2D Simulation Canvas</h2>
              </div>
              <div className="flex bg-surface-container-lowest border border-outline-variant rounded p-0.5">
                <button className="p-1 text-on-surface-variant hover:text-on-surface hover:bg-surface-bright transition-colors rounded" title="Zoom In">
                  <ZoomIn size={16} />
                </button>
                <button className="p-1 text-on-surface-variant hover:text-on-surface hover:bg-surface-bright transition-colors rounded" title="Zoom Out">
                  <ZoomOut size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 relative overflow-hidden">
              <div className="absolute inset-0 simulation-grid" />
              <div className="absolute inset-0">
                <TrayectoriaCanvas
                  segmentos={resultado?.trayectoria}
                  colisionDetectada={resultado?.colisionDetectada}
                  stockDim1={esTorno ? Number(stockDiametro) : Number(stockAncho)}
                  stockDim2={esTorno ? Number(stockLongitud) : Number(stockAlto)}
                  esTorno={esTorno}
                />
              </div>
              {primerError && (
                <div className="absolute top-4 right-4 w-80 bg-surface-container border-l-2 border-secondary-container rounded shadow-lg p-3 z-20 flex flex-col gap-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={18} className="text-secondary-container shrink-0" />
                    <div>
                      <h4 className="text-label-sm font-label-sm font-bold text-on-surface">
                        {resultado.errores.length > 1
                          ? `${resultado.errores.length} advertencias`
                          : "Validation Warning"}
                      </h4>
                      <p className="text-label-sm font-body-md text-on-surface-variant mt-1 leading-tight">
                        Línea {primerError.linea} ({primerError.tipo}): {primerError.mensaje}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Bottom status bar: min-h en vez de h fija + flex-wrap para que si el ancho no alcanza
            (panel abierto + ventana angosta) los botones bajen a una segunda linea en vez de
            cortarse contra el borde derecho. El texto "Execute Simulation" se oculta por debajo de
            sm y queda solo el icono, que ya deja claro la accion junto a Stop/Pause. */}
        <footer className="min-h-14 bg-surface-container border-t border-outline-variant flex flex-wrap items-center gap-2 px-4 py-2 justify-between shrink-0 z-20">
          <div className="flex items-center gap-3 sm:gap-6 font-code-md text-code-md text-on-surface bg-surface-container-lowest px-2.5 sm:px-4 py-1.5 border border-outline-variant rounded">
            <div className="flex items-center gap-2">
              <span className="text-outline">X:</span>
              <span className="font-bold tracking-wider">{(ultimoPunto?.xFin ?? 0).toFixed(3)}</span>
            </div>
            <div className="w-px h-4 bg-outline-variant" />
            <div className="flex items-center gap-2">
              <span className="text-outline">Z:</span>
              <span className="font-bold tracking-wider">{(ultimoPunto?.yFin ?? 0).toFixed(3)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="bg-surface hover:bg-surface-bright border border-outline-variant text-on-surface p-2 rounded transition-colors" title="Stop">
              <Square size={18} className="text-error" />
            </button>
            <button className="bg-surface hover:bg-surface-bright border border-outline-variant text-on-surface p-2 rounded transition-colors" title="Pause">
              <Pause size={18} className="text-secondary-container" />
            </button>
            <button
              onClick={ejecutarSimulacion}
              disabled={enviando || !ejercicioId}
              className="bg-primary hover:bg-primary-fixed-dim text-on-primary px-3 sm:px-4 py-2 rounded flex items-center gap-2 transition-colors font-label-sm disabled:opacity-50"
              title="Execute Simulation"
            >
              <Play size={18} />
              <span className="hidden sm:inline">{enviando ? "Enviando…" : "Execute Simulation"}</span>
            </button>
          </div>
        </footer>
      </div>
    </PageLayout>
  );
}
