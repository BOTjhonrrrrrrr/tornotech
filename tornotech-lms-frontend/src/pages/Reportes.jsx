import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Timer, ShieldCheck, ShieldAlert, Search } from "lucide-react";
import PageLayout from "../components/layout/PageLayout.jsx";
import api from "../api/client.js";

function iniciales(nombre) {
  if (!nombre) return "?";
  const partes = nombre.trim().split(" ");
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase();
}

function exportarCSV(filas) {
  const encabezado = "usuario,email,fecha_emision,fecha_vencimiento,estado";
  const cuerpo = filas
    .map((c) => [c.usuario?.nombre, c.usuario?.email, c.fechaEmision, c.fechaVencimiento, c.estado].join(","))
    .join("\n");
  const blob = new Blob([`${encabezado}\n${cuerpo}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "certificaciones_por_vencer.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reportes() {
  const [resumen, setResumen] = useState(null);
  const [porVencer, setPorVencer] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [errorCarga, setErrorCarga] = useState(null);

  useEffect(() => {
    setErrorCarga(null);
    api
      .get("/reportes/dashboard")
      .then((res) => setResumen(res.data))
      .catch(() => setErrorCarga("No se pudo cargar el resumen de reportes."));
    api
      .get("/reportes/certificaciones/por-vencer")
      .then((res) => setPorVencer(res.data))
      .catch(() => setErrorCarga("No se pudo cargar la lista de certificaciones por vencer."));
  }, []);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return porVencer;
    return porVencer.filter((c) => c.usuario?.nombre?.toLowerCase().includes(q));
  }, [porVencer, busqueda]);

  return (
    <PageLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-margin gap-4">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-on-surface">System Analytics</h2>
          <p className="text-label-sm font-label-sm text-outline mt-1">Certificaciones, ejercicios y actividad global</p>
        </div>
        <div className="flex gap-gutter">
          <button
            onClick={() => exportarCSV(porVencer)}
            className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded hover:bg-surface-container-high text-label-sm font-label-sm transition-colors"
          >
            <Download size={16} />
            CSV EXPORT
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded font-bold hover:bg-primary-fixed transition-colors text-label-sm font-label-sm"
          >
            <FileText size={16} />
            PDF REPORT
          </button>
        </div>
      </div>

      {errorCarga && (
        <div className="mb-4 rounded bg-error-container/20 text-error text-sm px-4 py-3 border border-error/40">
          {errorCarga}
        </div>
      )}

      {/* KPIs */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-margin">
        <div className="bg-surface-container border border-outline-variant rounded-lg p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
          <div className="flex justify-between items-start mb-4">
            <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">
              Intentos registrados
            </span>
            <Timer size={20} className="text-outline" />
          </div>
          <div className="text-headline-lg font-headline-lg text-primary mb-2">{resumen?.totalIntentos ?? "—"}</div>
        </div>

        <div className="bg-surface-container border border-outline-variant rounded-lg p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
          <div className="flex justify-between items-start mb-4">
            <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">
              Certificaciones vigentes
            </span>
            <ShieldCheck size={20} className="text-outline" />
          </div>
          <div className="text-headline-lg font-headline-lg text-primary mb-2">
            {resumen?.certificacionesVigentes ?? "—"}
          </div>
        </div>

        <div className="bg-surface-container border border-outline-variant rounded-lg p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-secondary-container" />
          <div className="flex justify-between items-start mb-4">
            <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">
              Por vencer / vencidas
            </span>
            <ShieldAlert size={20} className="text-outline" />
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-headline-lg font-headline-lg text-secondary-container">
              {resumen?.certificacionesPorVencer ?? "—"}
            </span>
            <span className="text-headline-md font-headline-md text-outline">/</span>
            <span className="text-headline-md font-headline-md text-error">{resumen?.certificacionesVencidas ?? "—"}</span>
          </div>
        </div>
      </section>

      {/* Tabla */}
      <section className="bg-surface-container border border-outline-variant rounded-lg flex flex-col">
        <div className="p-4 border-b border-outline-variant flex flex-col md:flex-row justify-between md:items-center gap-3 bg-surface-container-high rounded-t-lg">
          <h3 className="text-headline-md font-headline-md text-on-surface">Certificaciones por vencer (30 días)</h3>
          <div className="relative w-full md:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
            <input
              className="w-full bg-surface-dim border border-outline-variant rounded pl-9 pr-4 py-1.5 text-label-sm font-label-sm text-on-surface placeholder:text-outline focus:border-primary outline-none transition-shadow"
              placeholder="Buscar por nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="p-4 text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider w-[35%]">Usuario</th>
                <th className="p-4 text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Emisión</th>
                <th className="p-4 text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Vencimiento</th>
                <th className="p-4 text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody className="text-code-md font-code-md divide-y divide-outline-variant">
              {filtradas.map((c, i) => (
                <tr key={c.id} className={`hover:bg-surface-container-highest transition-colors ${i % 2 === 1 ? "bg-surface-container-low" : ""}`}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-surface-bright flex items-center justify-center text-primary font-bold shrink-0">
                        {iniciales(c.usuario?.nombre)}
                      </div>
                      <div>
                        <div className="text-on-surface">{c.usuario?.nombre}</div>
                        <div className="text-outline text-label-sm">{c.usuario?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-on-surface-variant">{c.fechaEmision}</td>
                  <td className="p-4 text-on-surface-variant">{c.fechaVencimiento}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-secondary-container/10 text-secondary-container border border-secondary-container/20 text-label-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary-container" />
                      {c.estado}
                    </span>
                  </td>
                </tr>
              ))}
              {filtradas.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-on-surface-variant font-body-md">
                    {porVencer.length === 0 ? "No hay certificaciones próximas a vencer." : "Sin resultados para tu búsqueda."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-auto p-4 border-t border-outline-variant flex justify-between items-center text-label-sm font-label-sm text-outline bg-surface-container-lowest rounded-b-lg">
          <span>
            Showing {filtradas.length} of {porVencer.length} records
          </span>
        </div>
      </section>
    </PageLayout>
  );
}
