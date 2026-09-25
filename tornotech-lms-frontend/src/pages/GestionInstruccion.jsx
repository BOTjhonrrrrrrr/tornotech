import { Fragment, useEffect, useState } from "react";
import { Plus, Wand2, LibraryBig, X, Sparkles, ChevronDown, ChevronUp, UserCheck, Users2, Check, Ruler, Pencil, Save, Trash2, Upload } from "lucide-react";
import PageLayout from "../components/layout/PageLayout.jsx";
import CodeEditor from "../components/simulador/CodeEditor.jsx";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

const MAQUINAS = ["TORNO_CNC", "FRESADORA_CNC"];
const DIFICULTADES = ["BASICO", "INTERMEDIO", "AVANZADO"];
const ESTRATEGIAS = ["LIBRE", "PUNTO_A_PUNTO", "INTERPOLACION_CIRCULAR"];

// Colores de badge por dificultad, siguiendo el mockup "Instructor Panel"
const BADGE_DIFICULTAD = {
  BASICO: "border-outline text-on-surface-variant",
  INTERMEDIO: "border-secondary text-secondary",
  AVANZADO: "border-error text-error",
};

function idEjercicio(id) {
  return `EX-${String(id).padStart(3, "0")}`;
}

export default function GestionInstruccion() {
  const { usuario } = useAuth();
  const [ejercicios, setEjercicios] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [maquina, setMaquina] = useState(MAQUINAS[0]);
  const [dificultad, setDificultad] = useState(DIFICULTADES[0]);
  const [generando, setGenerando] = useState(false);

  // Edicion (RF-04 extendido): null = creando un ejercicio nuevo; con un id, el formulario de
  // arriba pasa a modo edicion (precargado) y el submit hace PUT en vez de POST. piezaEditando
  // guarda la pieza ORIGINAL del ejercicio -- editar no debe regenerar una pieza aleatoria nueva,
  // eso invalidaria la geometria de cualquier intento ya enviado contra ese ejercicio.
  const [editandoId, setEditandoId] = useState(null);
  const [piezaEditando, setPiezaEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState(null);

  // RF-14 / ValidacionService: criterios opcionales de aprobación automática. Si no se activan,
  // el ejercicio queda sin criterios y todo intento pasa siempre por calificación manual.
  const [mostrarCriterios, setMostrarCriterios] = useState(false);
  const [diametroObjetivo, setDiametroObjetivo] = useState("");
  const [longitudCorte, setLongitudCorte] = useState("");
  const [toleranciaMm, setToleranciaMm] = useState("0.2");
  const [estrategiaEsperada, setEstrategiaEsperada] = useState("LIBRE");
  const [codigosRequeridos, setCodigosRequeridos] = useState("");
  const [codigosProhibidos, setCodigosProhibidos] = useState("");

  // Plano de referencia (opcional): el instructor pega el codigo ISO "solucion". El backend lo
  // simula internamente (GET /ejercicios/{id}/plano) y esa geometria es lo que ve el alumno como
  // plano tecnico bajo su editor -- el codigo en si nunca se le envia (ver Ejercicio.codigoReferencia).
  const [mostrarPlano, setMostrarPlano] = useState(false);
  const [codigoReferencia, setCodigoReferencia] = useState("");
  // Alternativa opcional al plano generado por codigo: una imagen (data URI completa) que el
  // instructor sube desde un CAD externo. A diferencia de codigoReferencia, esta SI vuelve en el
  // GET (no es WRITE_ONLY), asi que se puede precargar al editar un ejercicio existente.
  const [planoImagen, setPlanoImagen] = useState("");

  // RF-06: asignacion manual de ejercicios a un empleado o a un grupo completo. Sin esto, el
  // Simulador CNC mostraba todos los ejercicios a todos los APRENDIZ sin distincion.
  const [usuarios, setUsuarios] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [ejercicioAbiertoId, setEjercicioAbiertoId] = useState(null);
  const [asignaciones, setAsignaciones] = useState([]);
  const [cargandoAsignaciones, setCargandoAsignaciones] = useState(false);
  const [tipoAsignacion, setTipoAsignacion] = useState("usuario");
  const [targetAsignacion, setTargetAsignacion] = useState("");
  const [asignando, setAsignando] = useState(false);

  const [errorCarga, setErrorCarga] = useState(null);

  function cargarEjercicios() {
    setErrorCarga(null);
    api
      .get("/ejercicios")
      .then((res) => setEjercicios(res.data))
      .catch(() => setErrorCarga("No se pudo cargar la lista de ejercicios."));
  }

  useEffect(cargarEjercicios, []);

  // Instructor tambien puede leer /usuarios y /grupos (ver SecurityConfig) solo para poblar estos
  // selectores -- crear/editar usuarios sigue siendo exclusivo de ADMINISTRADOR (AdminUsuarios.jsx).
  useEffect(() => {
    api
      .get("/usuarios")
      .then((res) => setUsuarios(res.data.filter((u) => u.activo)))
      .catch(() => setErrorCarga("No se pudo cargar la lista de usuarios."));
    api
      .get("/grupos")
      .then((res) => setGrupos(res.data))
      .catch(() => setErrorCarga("No se pudo cargar la lista de grupos."));
  }, []);

  function cargarAsignaciones(ejercicioId) {
    setCargandoAsignaciones(true);
    api
      .get(`/asignaciones/ejercicio/${ejercicioId}`)
      .then((res) => setAsignaciones(res.data))
      .finally(() => setCargandoAsignaciones(false));
  }

  function alternarAsignacion(ejercicioId) {
    if (ejercicioAbiertoId === ejercicioId) {
      setEjercicioAbiertoId(null);
      return;
    }
    setEjercicioAbiertoId(ejercicioId);
    setTargetAsignacion("");
    cargarAsignaciones(ejercicioId);
  }

  async function crearAsignacion(ejercicioId) {
    if (!targetAsignacion) return;
    setAsignando(true);
    try {
      const cuerpo = { ejercicio: { id: ejercicioId } };
      if (tipoAsignacion === "usuario") {
        cuerpo.usuario = { id: Number(targetAsignacion) };
      } else {
        cuerpo.grupo = { id: Number(targetAsignacion) };
      }
      await api.post("/asignaciones", cuerpo);
      setTargetAsignacion("");
      cargarAsignaciones(ejercicioId);
    } finally {
      setAsignando(false);
    }
  }

  async function quitarAsignacion(ejercicioId, asignacionId) {
    await api.delete(`/asignaciones/${asignacionId}`);
    cargarAsignaciones(ejercicioId);
  }

  function limpiarCriterios() {
    setMostrarCriterios(false);
    setDiametroObjetivo("");
    setLongitudCorte("");
    setToleranciaMm("0.2");
    setEstrategiaEsperada("LIBRE");
    setCodigosRequeridos("");
    setCodigosProhibidos("");
    setMostrarPlano(false);
    setCodigoReferencia("");
  }

  function resetFormulario() {
    setNuevoTitulo("");
    setMaquina(MAQUINAS[0]);
    setDificultad(DIFICULTADES[0]);
    setEditandoId(null);
    setPiezaEditando(null);
    setMostrarForm(false);
    limpiarCriterios();
    setPlanoImagen("");
  }

  // Precarga el formulario con los datos del ejercicio (todos vienen del GET salvo
  // codigoReferencia, que es WRITE_ONLY -- ver Ejercicio.java -- por eso ese campo queda vacio y
  // solo se sobreescribe en el backend si el instructor escribe uno nuevo).
  function editarEjercicio(ej) {
    setEditandoId(ej.id);
    setPiezaEditando(ej.pieza);
    setNuevoTitulo(ej.titulo);
    setMaquina(ej.maquina);
    setDificultad(ej.dificultad);
    const tieneCriterios = ej.diametroObjetivo != null || ej.longitudCorte != null
      || (ej.codigosRequeridos && ej.codigosRequeridos.length > 0)
      || (ej.codigosProhibidos && ej.codigosProhibidos.length > 0)
      || (ej.estrategiaEsperada && ej.estrategiaEsperada !== "LIBRE");
    setMostrarCriterios(tieneCriterios);
    setDiametroObjetivo(ej.diametroObjetivo != null ? String(ej.diametroObjetivo) : "");
    setLongitudCorte(ej.longitudCorte != null ? String(ej.longitudCorte) : "");
    setToleranciaMm(ej.toleranciaMm != null ? String(ej.toleranciaMm) : "0.2");
    setEstrategiaEsperada(ej.estrategiaEsperada || "LIBRE");
    setCodigosRequeridos(ej.codigosRequeridos || "");
    setCodigosProhibidos(ej.codigosProhibidos || "");
    setMostrarPlano(false);
    setCodigoReferencia("");
    setPlanoImagen(ej.planoImagenBase64 || "");
    setMostrarForm(true);
    setEjercicioAbiertoId(null);
  }

  // RF-05: al crear, genera una pieza aleatoria nueva; al editar, conserva la pieza original
  // (piezaEditando) -- ver comentario en editandoId mas arriba.
  async function guardarEjercicio(e) {
    e.preventDefault();
    const esTorno = maquina === "TORNO_CNC";
    const cuerpoCriterios = {
      diametroObjetivo: mostrarCriterios && esTorno ? Number(diametroObjetivo) || undefined : undefined,
      longitudCorte: mostrarCriterios && esTorno ? Number(longitudCorte) || undefined : undefined,
      toleranciaMm: mostrarCriterios ? Number(toleranciaMm) || undefined : undefined,
      estrategiaEsperada: mostrarCriterios ? estrategiaEsperada : undefined,
      codigosRequeridos: mostrarCriterios && codigosRequeridos.trim() ? codigosRequeridos.trim() : undefined,
      codigosProhibidos: mostrarCriterios && codigosProhibidos.trim() ? codigosProhibidos.trim() : undefined,
      codigoReferencia: mostrarPlano && codigoReferencia.trim() ? codigoReferencia.trim() : undefined,
      // No es WRITE_ONLY como codigoReferencia: se envia siempre el valor actual (incluida cadena
      // vacia -> null) para poder tanto conservar como quitar una imagen ya subida al editar.
      planoImagenBase64: planoImagen || null,
    };

    if (editandoId) {
      setGuardando(true);
      try {
        await api.put(`/ejercicios/${editandoId}`, {
          titulo: nuevoTitulo,
          maquina,
          dificultad,
          pieza: { id: piezaEditando.id },
          ...cuerpoCriterios,
        });
        resetFormulario();
        cargarEjercicios();
      } finally {
        setGuardando(false);
      }
      return;
    }

    setGenerando(true);
    try {
      const { data: pieza } = await api.post(`/piezas/generar-aleatoria?maquina=${maquina}`);
      await api.post("/ejercicios", {
        titulo: nuevoTitulo,
        maquina,
        dificultad,
        pieza: { id: pieza.id },
        instructor: { id: usuario.id },
        ...cuerpoCriterios,
      });
      resetFormulario();
      cargarEjercicios();
    } finally {
      setGenerando(false);
    }
  }

  // Lee el PNG elegido como data URI (base64) para guardarlo directo en el campo del ejercicio --
  // sin esto habria que armar un endpoint multipart aparte solo para esto.
  function onSubirImagenPlano(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = () => setPlanoImagen(lector.result);
    lector.readAsDataURL(archivo);
    e.target.value = ""; // permite volver a elegir el mismo archivo si se quiere reemplazar
  }

  // DELETE /ejercicios/{id} ya existia en el backend, solo faltaba exponerlo aca. Confirmacion
  // simple porque puede afectar asignaciones/intentos ya generados contra este ejercicio.
  async function eliminarEjercicio(ej) {
    const ok = window.confirm(
      `¿Eliminar "${ej.titulo}" (${idEjercicio(ej.id)})? Esto también afecta sus asignaciones e intentos asociados.`
    );
    if (!ok) return;
    setEliminandoId(ej.id);
    setErrorCarga(null);
    try {
      await api.delete(`/ejercicios/${ej.id}`);
      if (editandoId === ej.id) resetFormulario();
      if (ejercicioAbiertoId === ej.id) setEjercicioAbiertoId(null);
      cargarEjercicios();
    } catch (err) {
      setErrorCarga(err.response?.data?.error || "No se pudo eliminar el ejercicio.");
    } finally {
      setEliminandoId(null);
    }
  }

  return (
    <PageLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-headline-lg font-headline-lg text-on-surface mb-1">Instructor Panel</h1>
          <p className="text-on-surface-variant text-body-md font-body-md">
            Gestiona ejercicios, asigna a empleados y revisa el avance.
          </p>
        </div>
        <button
          onClick={() => (mostrarForm ? resetFormulario() : setMostrarForm(true))}
          className="bg-primary hover:bg-primary-fixed-dim text-on-primary-fixed px-4 py-2 flex items-center gap-2 rounded transition-colors text-label-sm font-label-sm font-bold shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]"
        >
          {mostrarForm ? <X size={18} /> : <Plus size={18} />}
          {mostrarForm ? "Cancelar" : "Create New Exercise"}
        </button>
      </div>

      {errorCarga && (
        <div className="mb-4 rounded bg-error-container/20 text-error text-sm px-4 py-3 border border-error/40">
          {errorCarga}
        </div>
      )}

      {mostrarForm && (
        <form
          onSubmit={guardarEjercicio}
          className="bg-surface-container-low border border-outline-variant rounded p-4 mb-gutter flex flex-col gap-4"
        >
          {editandoId && (
            <div className="flex items-center gap-2 text-label-sm font-label-sm text-primary uppercase tracking-wider">
              <Pencil size={14} />
              Editando {idEjercicio(editandoId)}
            </div>
          )}
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1 uppercase tracking-wider">
                Título
              </label>
              <input
                className="w-full bg-surface-container-highest border border-outline-variant text-on-surface rounded px-3 py-2 text-sm focus:border-primary outline-none"
                value={nuevoTitulo}
                onChange={(e) => setNuevoTitulo(e.target.value)}
                placeholder="Ej: Cilindrado básico de eje escalonado"
                required
              />
            </div>
            <div className="w-full md:w-48">
              <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1 uppercase tracking-wider">
                Máquina
              </label>
              <select
                className="w-full bg-surface-container-highest border border-outline-variant text-on-surface rounded px-3 py-2 text-sm focus:border-primary outline-none"
                value={maquina}
                onChange={(e) => setMaquina(e.target.value)}
              >
                {MAQUINAS.map((m) => (
                  <option key={m} value={m}>
                    {m.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full md:w-48">
              <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1 uppercase tracking-wider">
                Dificultad
              </label>
              <select
                className="w-full bg-surface-container-highest border border-outline-variant text-on-surface rounded px-3 py-2 text-sm focus:border-primary outline-none"
                value={dificultad}
                onChange={(e) => setDificultad(e.target.value)}
              >
                {DIFICULTADES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={generando || guardando}
              className="bg-primary hover:bg-primary-fixed-dim text-on-primary rounded px-4 py-2 text-label-sm font-label-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
            >
              {editandoId ? <Save size={16} /> : <Wand2 size={16} />}
              {editandoId ? (guardando ? "Guardando…" : "Guardar cambios") : generando ? "Generando…" : "Generar pieza y crear"}
            </button>
          </div>

          <div className="border-t border-outline-variant pt-3">
            <button
              type="button"
              onClick={() => setMostrarCriterios((v) => !v)}
              className="flex items-center gap-2 text-label-sm font-label-sm text-primary uppercase tracking-wider"
            >
              <Sparkles size={14} />
              Aprobación automática (opcional)
              {mostrarCriterios ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <p className="text-label-sm font-label-sm text-on-surface-variant mt-1">
              Si no se configura, todo intento de este ejercicio pasa siempre por calificación manual.
            </p>

            {mostrarCriterios && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                {maquina === "TORNO_CNC" ? (
                  <>
                    <div>
                      <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1 uppercase tracking-wider">
                        Diámetro objetivo (mm)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        className="w-full bg-surface-container-highest border border-outline-variant text-on-surface rounded px-3 py-2 text-sm focus:border-primary outline-none"
                        value={diametroObjetivo}
                        onChange={(e) => setDiametroObjetivo(e.target.value)}
                        placeholder="Ej: 30"
                      />
                    </div>
                    <div>
                      <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1 uppercase tracking-wider">
                        Longitud de corte (mm)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        className="w-full bg-surface-container-highest border border-outline-variant text-on-surface rounded px-3 py-2 text-sm focus:border-primary outline-none"
                        value={longitudCorte}
                        onChange={(e) => setLongitudCorte(e.target.value)}
                        placeholder="Ej: 80"
                      />
                    </div>
                    <div>
                      <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1 uppercase tracking-wider">
                        Tolerancia (mm)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.05"
                        className="w-full bg-surface-container-highest border border-outline-variant text-on-surface rounded px-3 py-2 text-sm focus:border-primary outline-none"
                        value={toleranciaMm}
                        onChange={(e) => setToleranciaMm(e.target.value)}
                      />
                    </div>
                  </>
                ) : (
                  <p className="md:col-span-3 text-label-sm font-label-sm text-on-surface-variant">
                    El criterio de dimensión (diámetro objetivo) solo está disponible para torno por ahora;
                    para fresadora solo se validan códigos/estrategia.
                  </p>
                )}
                <div>
                  <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1 uppercase tracking-wider">
                    Estrategia esperada
                  </label>
                  <select
                    className="w-full bg-surface-container-highest border border-outline-variant text-on-surface rounded px-3 py-2 text-sm focus:border-primary outline-none"
                    value={estrategiaEsperada}
                    onChange={(e) => setEstrategiaEsperada(e.target.value)}
                  >
                    {ESTRATEGIAS.map((e) => (
                      <option key={e} value={e}>
                        {e.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1 uppercase tracking-wider">
                    Códigos requeridos
                  </label>
                  <input
                    className="w-full bg-surface-container-highest border border-outline-variant text-on-surface rounded px-3 py-2 text-sm focus:border-primary outline-none"
                    value={codigosRequeridos}
                    onChange={(e) => setCodigosRequeridos(e.target.value)}
                    placeholder="Ej: G02,G03"
                  />
                </div>
                <div>
                  <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1 uppercase tracking-wider">
                    Códigos prohibidos
                  </label>
                  <input
                    className="w-full bg-surface-container-highest border border-outline-variant text-on-surface rounded px-3 py-2 text-sm focus:border-primary outline-none"
                    value={codigosProhibidos}
                    onChange={(e) => setCodigosProhibidos(e.target.value)}
                    placeholder="Ej: G00"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-outline-variant pt-3">
            <button
              type="button"
              onClick={() => setMostrarPlano((v) => !v)}
              className="flex items-center gap-2 text-label-sm font-label-sm text-primary uppercase tracking-wider"
            >
              <Ruler size={14} />
              Plano de referencia (opcional)
              {mostrarPlano ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <p className="text-label-sm font-label-sm text-on-surface-variant mt-1">
              Pega el código ISO solución, o sube directamente una imagen del plano de manufactura
              hecho en CAD -- si subes una imagen, esa es la que ve el alumno (tiene prioridad sobre
              el código).
              {editandoId && " Si dejas ambos vacíos, se conserva lo que ya tenía este ejercicio."}
            </p>

            {mostrarPlano && (
              <div className="mt-3 flex flex-col gap-3">
                <div className="h-48 border border-outline-variant rounded overflow-hidden flex bg-surface-container-lowest">
                  <CodeEditor value={codigoReferencia} onChange={setCodigoReferencia} />
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <label className="flex items-center gap-2 px-3 py-1.5 rounded border border-outline-variant text-label-sm font-label-sm text-on-surface-variant hover:text-on-surface cursor-pointer transition-colors">
                    <Upload size={14} />
                    Subir plano CAD (PNG)
                    <input type="file" accept="image/png" className="hidden" onChange={onSubirImagenPlano} />
                  </label>
                  {planoImagen && (
                    <>
                      <img
                        src={planoImagen}
                        alt="Vista previa del plano subido"
                        className="h-10 w-10 object-cover rounded border border-outline-variant bg-surface"
                      />
                      <button
                        type="button"
                        onClick={() => setPlanoImagen("")}
                        className="text-error text-label-sm font-label-sm hover:underline"
                      >
                        Quitar imagen
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </form>
      )}

      <div className="bg-surface-container-low border border-outline-variant rounded p-4 flex flex-col">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-outline-variant">
          <h2 className="text-headline-md font-headline-md text-on-surface flex items-center gap-2">
            <LibraryBig size={20} className="text-primary" />
            Exercise Library
          </h2>
        </div>

        <div className="overflow-x-auto border border-outline-variant rounded">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-high border-b border-outline-variant text-label-sm font-label-sm text-outline">
              <tr>
                <th className="p-2 border-r border-outline-variant font-medium">EX-ID</th>
                <th className="p-2 border-r border-outline-variant font-medium">Module Name</th>
                <th className="p-2 border-r border-outline-variant font-medium">Machine</th>
                <th className="p-2 border-r border-outline-variant font-medium">Difficulty</th>
                <th className="p-2 border-r border-outline-variant font-medium">Editar</th>
                <th className="p-2 font-medium">Asignación</th>
              </tr>
            </thead>
            <tbody className="text-body-md font-body-md text-on-surface">
              {ejercicios.map((ej, i) => (
                <Fragment key={ej.id}>
                  <tr
                    className={`border-b border-outline-variant last:border-0 hover:bg-surface-container-high transition-colors ${
                      i % 2 === 1 ? "bg-surface-container-lowest" : ""
                    }`}
                  >
                    <td className="p-2 border-r border-outline-variant font-code-md text-code-md text-primary">
                      {idEjercicio(ej.id)}
                    </td>
                    <td className="p-2 border-r border-outline-variant">{ej.titulo}</td>
                    <td className="p-2 border-r border-outline-variant">{ej.maquina?.replace("_", " ")}</td>
                    <td className="p-2 border-r border-outline-variant">
                      <span
                        className={`px-2 py-0.5 bg-surface-container-highest border rounded text-label-sm ${BADGE_DIFICULTAD[ej.dificultad] || ""}`}
                      >
                        {ej.dificultad}
                      </span>
                    </td>
                    <td className="p-2 border-r border-outline-variant">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => editarEjercicio(ej)}
                          className="flex items-center gap-1.5 px-2 py-1 rounded text-label-sm font-label-sm uppercase tracking-wider border border-outline-variant text-on-surface-variant hover:text-on-surface transition-colors"
                          title="Editar ejercicio"
                        >
                          <Pencil size={14} />
                          Editar
                        </button>
                        <button
                          onClick={() => eliminarEjercicio(ej)}
                          disabled={eliminandoId === ej.id}
                          className="flex items-center gap-1.5 px-2 py-1 rounded text-label-sm font-label-sm uppercase tracking-wider border border-error/40 text-error hover:bg-error/10 transition-colors disabled:opacity-50"
                          title="Eliminar ejercicio"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="p-2">
                      <button
                        onClick={() => alternarAsignacion(ej.id)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded text-label-sm font-label-sm uppercase tracking-wider border transition-colors ${
                          ejercicioAbiertoId === ej.id
                            ? "bg-primary text-on-primary border-primary"
                            : "border-outline-variant text-on-surface-variant hover:text-on-surface"
                        }`}
                      >
                        <UserCheck size={14} />
                        Asignar
                      </button>
                    </td>
                  </tr>
                  {ejercicioAbiertoId === ej.id && (
                    <tr className="border-b border-outline-variant bg-surface-container-low">
                      <td colSpan={6} className="p-4">
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-wrap gap-2">
                            {cargandoAsignaciones && (
                              <span className="text-label-sm text-on-surface-variant">Cargando asignaciones…</span>
                            )}
                            {!cargandoAsignaciones && asignaciones.length === 0 && (
                              <span className="text-label-sm text-on-surface-variant">
                                Este ejercicio todavía no está asignado a nadie.
                              </span>
                            )}
                            {asignaciones.map((a) => (
                              <span
                                key={a.id}
                                className="flex items-center gap-1.5 px-2 py-1 bg-surface-container-highest border border-outline-variant rounded text-label-sm"
                              >
                                {a.usuario ? <UserCheck size={12} className="text-primary" /> : <Users2 size={12} className="text-secondary" />}
                                {a.usuario ? a.usuario.nombre : a.grupo?.nombre}
                                <button
                                  onClick={() => quitarAsignacion(ej.id, a.id)}
                                  className="text-on-surface-variant hover:text-error transition-colors"
                                  title="Quitar asignación"
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            ))}
                          </div>

                          <div className="flex flex-wrap items-end gap-2">
                            <div>
                              <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1 uppercase tracking-wider">
                                Asignar a
                              </label>
                              <select
                                value={tipoAsignacion}
                                onChange={(e) => {
                                  setTipoAsignacion(e.target.value);
                                  setTargetAsignacion("");
                                }}
                                className="bg-surface-container-highest border border-outline-variant text-on-surface rounded px-3 py-2 text-sm focus:border-primary outline-none"
                              >
                                <option value="usuario">Aprendiz</option>
                                <option value="grupo">Grupo</option>
                              </select>
                            </div>
                            <div className="min-w-[200px]">
                              <label className="text-label-sm font-label-sm text-on-surface-variant block mb-1 uppercase tracking-wider">
                                {tipoAsignacion === "usuario" ? "Aprendiz" : "Grupo"}
                              </label>
                              <select
                                value={targetAsignacion}
                                onChange={(e) => setTargetAsignacion(e.target.value)}
                                className="w-full bg-surface-container-highest border border-outline-variant text-on-surface rounded px-3 py-2 text-sm focus:border-primary outline-none"
                              >
                                <option value="">Selecciona…</option>
                                {tipoAsignacion === "usuario"
                                  ? usuarios
                                      .filter((u) => u.rol === "APRENDIZ")
                                      .map((u) => (
                                        <option key={u.id} value={u.id}>
                                          {u.nombre} ({u.email})
                                        </option>
                                      ))
                                  : grupos.map((g) => (
                                      <option key={g.id} value={g.id}>
                                        {g.nombre}
                                      </option>
                                    ))}
                              </select>
                            </div>
                            <button
                              onClick={() => crearAsignacion(ej.id)}
                              disabled={!targetAsignacion || asignando}
                              className="flex items-center gap-2 px-4 py-2 rounded text-label-sm font-label-sm font-bold uppercase tracking-wider bg-primary text-on-primary hover:bg-primary-fixed-dim transition-colors disabled:opacity-50"
                            >
                              <Check size={14} />
                              Asignar
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {ejercicios.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-on-surface-variant">
                    Aún no hay ejercicios creados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageLayout>
  );
}
