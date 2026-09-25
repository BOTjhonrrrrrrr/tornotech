import { useEffect, useRef, useState } from "react";

/**
 * Plano tecnico de referencia (estatico, solo lectura): dibuja el contorno final de la pieza
 * calculado por el backend a partir de Ejercicio.codigoReferencia (ver EjercicioController.plano),
 * con lineas de cota (longitud total y diametro/ancho/alto maximo) al estilo de un plano de taller.
 * A diferencia de TrayectoriaCanvas (que anima la trayectoria en vivo del alumno, con colores por
 * tipo de movimiento), aqui todo se dibuja en un solo trazo neutro: lo que importa es la forma final
 * y sus medidas, no como se llego a ella.
 *
 * Responsivo via ResizeObserver, mismo patron que TrayectoriaCanvas.
 */
export default function PlanoTecnico({ trayectoria = [], esTorno = true }) {
  const contenedorRef = useRef(null);
  const [tamano, setTamano] = useState({ ancho: 800, alto: 260 });

  useEffect(() => {
    const el = contenedorRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setTamano({ ancho: width, alto: height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const PADDING = 46; // mas espacio que TrayectoriaCanvas: hay que dejar sitio a las lineas de cota
  const ANCHO = tamano.ancho;
  const ALTO = tamano.alto;
  const COLOR_TRAZO = "#d6e4f9"; // on-surface: contorno tecnico neutro, no colores por tipo de movimiento
  const COLOR_COTA = "#87929b"; // outline

  if (!trayectoria || trayectoria.length === 0) {
    return (
      <div ref={contenedorRef} className="w-full h-full flex items-center justify-center">
        <p className="text-label-sm font-label-sm text-on-surface-variant">Sin geometría para mostrar.</p>
      </div>
    );
  }

  if (esTorno) {
    const puntosZ = trayectoria.flatMap((s) => [s.yInicio, s.yFin]);
    const puntosRadio = trayectoria.flatMap((s) => [Math.abs(s.xInicio) / 2, Math.abs(s.xFin) / 2]);
    const minZ = Math.min(0, ...puntosZ);
    const maxZ = Math.max(0, ...puntosZ);
    const maxRadio = Math.max(0, ...puntosRadio);
    const longitudTotal = maxZ - minZ;
    const diametroMax = maxRadio * 2;

    // Deja franjas fijas abajo (cota de longitud) y a la derecha (cota de diametro) fuera del
    // area de dibujo, para que las lineas de cota nunca se encimen con el contorno de la pieza.
    const FRANJA_COTA = 42;
    const dibujoAncho = ANCHO - 2 * PADDING - FRANJA_COTA;
    const dibujoAlto = ALTO - 2 * PADDING - FRANJA_COTA;

    const escalaZ = dibujoAncho / (longitudTotal || 1);
    const escalaX = dibujoAlto / (2 * maxRadio || 1);
    const escala = Math.min(escalaZ, escalaX);

    const centroY = PADDING + dibujoAlto / 2;
    const proyZ = (z) => PADDING + (z - minZ) * escala;
    const proyArriba = (xDiametro) => centroY - (xDiametro / 2) * escala;
    const proyAbajo = (xDiametro) => centroY + (xDiametro / 2) * escala;

    const yCotaLongitud = PADDING + dibujoAlto + 24;
    const xCotaDiametro = PADDING + dibujoAncho + 24;

    return (
      <div ref={contenedorRef} className="w-full h-full">
        <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="w-full h-full block">
          <defs>
            <marker id="plano-flecha" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 Z" fill={COLOR_COTA} />
            </marker>
          </defs>

          {/* Linea de centro */}
          <line x1={PADDING} y1={centroY} x2={PADDING + dibujoAncho} y2={centroY} stroke="#3fc6e0" strokeWidth={1} strokeDasharray="6 4" opacity={0.3} />

          {/* Contorno de la pieza: un solo trazo neutro, arriba y abajo (simetrico) */}
          {trayectoria.map((s, i) => (
            <g key={i}>
              <line x1={proyZ(s.yInicio)} y1={proyArriba(s.xInicio)} x2={proyZ(s.yFin)} y2={proyArriba(s.xFin)} stroke={COLOR_TRAZO} strokeWidth={2} />
              <line x1={proyZ(s.yInicio)} y1={proyAbajo(s.xInicio)} x2={proyZ(s.yFin)} y2={proyAbajo(s.xFin)} stroke={COLOR_TRAZO} strokeWidth={2} />
            </g>
          ))}

          {/* Cota de longitud total (horizontal, debajo de la pieza) */}
          <line x1={proyZ(minZ)} y1={yCotaLongitud} x2={proyZ(maxZ)} y2={yCotaLongitud} stroke={COLOR_COTA} strokeWidth={1} markerStart="url(#plano-flecha)" markerEnd="url(#plano-flecha)" />
          <line x1={proyZ(minZ)} y1={centroY + maxRadio * escala} x2={proyZ(minZ)} y2={yCotaLongitud} stroke={COLOR_COTA} strokeWidth={0.75} strokeDasharray="2 2" />
          <line x1={proyZ(maxZ)} y1={centroY + maxRadio * escala} x2={proyZ(maxZ)} y2={yCotaLongitud} stroke={COLOR_COTA} strokeWidth={0.75} strokeDasharray="2 2" />
          <text x={(proyZ(minZ) + proyZ(maxZ)) / 2} y={yCotaLongitud + 14} textAnchor="middle" fontSize="11" fill={COLOR_COTA}>
            L {longitudTotal.toFixed(1)} mm
          </text>

          {/* Cota de diametro maximo (vertical, a la derecha) */}
          <line x1={xCotaDiametro} y1={proyArriba(diametroMax)} x2={xCotaDiametro} y2={proyAbajo(diametroMax)} stroke={COLOR_COTA} strokeWidth={1} markerStart="url(#plano-flecha)" markerEnd="url(#plano-flecha)" />
          <line x1={proyZ(maxZ)} y1={proyArriba(diametroMax)} x2={xCotaDiametro} y2={proyArriba(diametroMax)} stroke={COLOR_COTA} strokeWidth={0.75} strokeDasharray="2 2" />
          <line x1={proyZ(maxZ)} y1={proyAbajo(diametroMax)} x2={xCotaDiametro} y2={proyAbajo(diametroMax)} stroke={COLOR_COTA} strokeWidth={0.75} strokeDasharray="2 2" />
          <text x={xCotaDiametro + 6} y={centroY} textAnchor="start" fontSize="11" fill={COLOR_COTA} dominantBaseline="middle">
            Ø{diametroMax.toFixed(1)}
          </text>
        </svg>
      </div>
    );
  }

  // --- Fresadora: bloque referenciado en el origen, cotas de ancho (X) y alto (Y).
  const puntos = trayectoria.flatMap((s) => [
    { x: s.xInicio, y: s.yInicio },
    { x: s.xFin, y: s.yFin },
  ]);
  const minX = Math.min(0, ...puntos.map((p) => p.x));
  const maxX = Math.max(0, ...puntos.map((p) => p.x));
  const minY = Math.min(0, ...puntos.map((p) => p.y));
  const maxY = Math.max(0, ...puntos.map((p) => p.y));
  const anchoTotal = maxX - minX;
  const altoTotal = maxY - minY;

  const FRANJA_COTA = 42;
  const dibujoAncho = ANCHO - 2 * PADDING - FRANJA_COTA;
  const dibujoAlto = ALTO - 2 * PADDING - FRANJA_COTA;
  const escalaX = dibujoAncho / (anchoTotal || 1);
  const escalaY = dibujoAlto / (altoTotal || 1);
  const escala = Math.min(escalaX, escalaY);

  const proyX = (x) => PADDING + (x - minX) * escala;
  const proyY = (y) => PADDING + dibujoAlto - (y - minY) * escala;
  const yCota = PADDING + dibujoAlto + 24;
  const xCota = PADDING + dibujoAncho + 24;

  return (
    <div ref={contenedorRef} className="w-full h-full">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="w-full h-full block">
        <defs>
          <marker id="plano-flecha-fresa" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 Z" fill={COLOR_COTA} />
          </marker>
        </defs>

        {trayectoria.map((s, i) => (
          <line key={i} x1={proyX(s.xInicio)} y1={proyY(s.yInicio)} x2={proyX(s.xFin)} y2={proyY(s.yFin)} stroke={COLOR_TRAZO} strokeWidth={2} />
        ))}

        <line x1={proyX(minX)} y1={yCota} x2={proyX(maxX)} y2={yCota} stroke={COLOR_COTA} strokeWidth={1} markerStart="url(#plano-flecha-fresa)" markerEnd="url(#plano-flecha-fresa)" />
        <text x={(proyX(minX) + proyX(maxX)) / 2} y={yCota + 14} textAnchor="middle" fontSize="11" fill={COLOR_COTA}>
          {anchoTotal.toFixed(1)} mm
        </text>

        <line x1={xCota} y1={proyY(minY)} x2={xCota} y2={proyY(maxY)} stroke={COLOR_COTA} strokeWidth={1} markerStart="url(#plano-flecha-fresa)" markerEnd="url(#plano-flecha-fresa)" />
        <text x={xCota + 6} y={(proyY(minY) + proyY(maxY)) / 2} textAnchor="start" fontSize="11" fill={COLOR_COTA} dominantBaseline="middle">
          {altoTotal.toFixed(1)} mm
        </text>
      </svg>
    </div>
  );
}
