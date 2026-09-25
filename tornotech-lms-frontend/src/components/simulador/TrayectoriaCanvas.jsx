import { useEffect, useRef, useState } from "react";

/**
 * Renderiza la trayectoria 2D devuelta por /api/simulacion/ejecutar (RF-10), mas la sombra
 * de la pieza en bruto y (en torno) la mordaza de sujecion, a partir de las dimensiones
 * definidas manualmente en el panel "Pieza en bruto" del simulador.
 *
 * segmentos: [{ xInicio, yInicio, xFin, yFin, tipo }]
 * tipo "RAPIDO" (G00) se dibuja punteado, "LINEAL" (G01) solido en color primary,
 * "ARCO" (G02/G03, teselado en sub-segmentos por el backend) solido en color secondary.
 *
 * Convencion de ejes en TORNO (vista de corte longitudinal, como un plano de taller):
 * - Z es el eje horizontal. Z0 esta siempre en el extremo mas alejado de la mordaza (la cara libre
 *   de la pieza, a la derecha); Z negativo avanza hacia la mordaza, a la izquierda.
 * - X es el eje vertical y se dibuja de forma simetrica respecto a la linea de centro (X0): cada
 *   movimiento se refleja arriba y abajo, como el corte longitudinal real de una pieza cilindrica.
 *   X se interpreta en modo diametro (igual que el codigo ISO, p. ej. "X40" = Ø40), por eso el
 *   desplazamiento vertical desde el centro es X/2 (radio) a cada lado.
 * - Ejemplo: ir de X0 Z0 a X10 Z-10 dibuja un triangulo (dos lineas simetricas que parten del mismo
 *   punto en el eje de centro, junto a la cara libre, y se abren hacia la mordaza).
 *
 * Convencion en FRESADORA: bloque referenciado en el origen (0..ancho, 0..alto), sin espejo.
 *
 * Responsivo: antes usaba un viewBox fijo de 800x600 con "w-full h-full", lo que en teoria deberia
 * escalar via preserveAspectRatio -- pero en paneles muy anchos/bajos (tipico del layout de 70%
 * del Simulador CNC) el resultado se sentia "cortado" y obligaba a hacer scroll para ver la pieza
 * completa. Ahora se mide el contenedor real con ResizeObserver y el viewBox usa esas dimensiones
 * exactas, para que la proyeccion siempre ocupe el 100% del espacio disponible sin desbordar.
 */
export default function TrayectoriaCanvas({
  segmentos = [],
  colisionDetectada,
  stockDim1, // torno: diametro Ø; fresadora: ancho
  stockDim2, // torno: longitud; fresadora: alto
  esTorno = true,
}) {
  const contenedorRef = useRef(null);
  const [tamano, setTamano] = useState({ ancho: 800, alto: 600 });

  useEffect(() => {
    const el = contenedorRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setTamano({ ancho: width, alto: height });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const PADDING = 30;
  const ANCHO = tamano.ancho;
  const ALTO = tamano.alto;
  const tieneStock = Number.isFinite(stockDim1) && stockDim1 > 0 && Number.isFinite(stockDim2) && stockDim2 > 0;
  const colorTrazo = (tipo) => (tipo === "RAPIDO" ? "#ffb4ab" : tipo === "ARCO" ? "#ffb86b" : "#83cfff");

  if (esTorno) {
    // Z0 = cara libre (extremo mas alejado de la mordaza), a la derecha. Z negativo hacia la mordaza,
    // a la izquierda. X se dibuja simetrico respecto al eje de centro (X0), como un corte longitudinal.
    const stockZMin = tieneStock ? -stockDim2 : 0;
    const stockZMax = 0;

    const puntosZ = segmentos.flatMap((s) => [s.yInicio, s.yFin]);
    const puntosRadio = segmentos.flatMap((s) => [Math.abs(s.xInicio) / 2, Math.abs(s.xFin) / 2]);

    const zs = [0, stockZMin, stockZMax, ...puntosZ];
    const radios = [0, tieneStock ? stockDim1 / 2 : 0, ...puntosRadio];

    // Sin forzar un piso artificial: si el maximo real es 0 (Z0, la cara libre), debe caer
    // exactamente en el borde derecho, tal como se espera de la convencion de ejes del torno.
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    const maxRadio = Math.max(...radios);

    const escalaZ = (ANCHO - 2 * PADDING) / (maxZ - minZ || 1);
    const escalaX = (ALTO - 2 * PADDING) / (2 * maxRadio || 1);
    const escala = Math.min(escalaZ, escalaX);

    const centroY = ALTO / 2;
    const proyZ = (z) => PADDING + (z - minZ) * escala;
    // xDiametro: valor programado en modo diametro; se dibuja a X/2 (radio) de cada lado del centro.
    const proyArriba = (xDiametro) => centroY - (xDiametro / 2) * escala;
    const proyAbajo = (xDiametro) => centroY + (xDiametro / 2) * escala;

    const ultimo = segmentos.length ? segmentos[segmentos.length - 1] : null;
    const jawDepth = tieneStock ? Math.min(15, stockDim2 * 0.25) : 0;
    const jawDiametro = tieneStock ? stockDim1 * 1.15 : 0;

    return (
      <div ref={contenedorRef} className="w-full h-full">
        <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="w-full h-full block">
          {/* Linea de centro (eje de simetria, X0) */}
          <line
            x1={PADDING}
            y1={centroY}
            x2={ANCHO - PADDING}
            y2={centroY}
            stroke="#3fc6e0"
            strokeWidth={1}
            strokeDasharray="6 4"
            opacity={0.35}
          />

          {/* Sombra de la pieza en bruto */}
          {tieneStock && (
            <rect
              x={proyZ(stockZMin)}
              y={proyArriba(stockDim1)}
              width={proyZ(stockZMax) - proyZ(stockZMin)}
              height={proyAbajo(stockDim1) - proyArriba(stockDim1)}
              fill="rgba(131, 207, 255, 0.08)"
              stroke="rgba(131, 207, 255, 0.35)"
              strokeDasharray="5 4"
              strokeWidth={1}
            />
          )}

          {/* Mordaza de sujecion: bloque solido junto al extremo Z = -longitud (izquierda) */}
          {tieneStock && jawDepth > 0 && (
            <>
              <rect
                x={proyZ(stockZMin)}
                y={proyArriba(jawDiametro)}
                width={proyZ(stockZMin + jawDepth) - proyZ(stockZMin)}
                height={proyAbajo(jawDiametro) - proyArriba(jawDiametro)}
                fill="#283646"
                stroke="#87929b"
                strokeWidth={1}
              />
              <text
                x={proyZ(stockZMin + jawDepth / 2)}
                y={proyArriba(jawDiametro) - 6}
                textAnchor="middle"
                fontSize="11"
                fill="#87929b"
              >
                Mordaza
              </text>
            </>
          )}

          {tieneStock && (
            <text x={proyZ(stockZMax) - 4} y={centroY - 6} textAnchor="end" fontSize="11" fill="#5d6a82">
              Ø{stockDim1.toFixed(1)} mm (Z0)
            </text>
          )}

          {segmentos.length === 0 ? (
            <text x={ANCHO / 2} y={ALTO / 2} textAnchor="middle" fontSize="14" fill="#87929b">
              Ejecuta el código para ver la trayectoria
            </text>
          ) : (
            segmentos.map((s, i) => (
              <g key={i}>
                <line
                  x1={proyZ(s.yInicio)}
                  y1={proyArriba(s.xInicio)}
                  x2={proyZ(s.yFin)}
                  y2={proyArriba(s.xFin)}
                  stroke={colorTrazo(s.tipo)}
                  strokeWidth={s.tipo === "RAPIDO" ? 1.5 : 2.5}
                  strokeDasharray={s.tipo === "RAPIDO" ? "6 4" : undefined}
                />
                <line
                  x1={proyZ(s.yInicio)}
                  y1={proyAbajo(s.xInicio)}
                  x2={proyZ(s.yFin)}
                  y2={proyAbajo(s.xFin)}
                  stroke={colorTrazo(s.tipo)}
                  strokeWidth={s.tipo === "RAPIDO" ? 1.5 : 2.5}
                  strokeDasharray={s.tipo === "RAPIDO" ? "6 4" : undefined}
                  opacity={0.55}
                />
              </g>
            ))
          )}
          {ultimo && (
            <circle cx={proyZ(ultimo.yFin)} cy={proyArriba(ultimo.xFin)} r={4} fill="#83cfff" className="animate-pulse" />
          )}
        </svg>
        {colisionDetectada && (
          <p className="absolute bottom-3 left-3 text-label-sm font-label-sm text-error bg-surface-container border border-error/40 rounded px-3 py-1.5">
            ⚠ Trayectoria fuera de los límites de la pieza (posible colisión).
          </p>
        )}
      </div>
    );
  }

  // --- Fresadora: bloque referenciado en el origen (0..ancho, 0..alto), sin espejo.
  const stockXMin = 0;
  const stockXMax = tieneStock ? stockDim1 : 0;
  const stockYMin = 0;
  const stockYMax = tieneStock ? stockDim2 : 0;

  const puntos = segmentos.flatMap((s) => [
    { x: s.xInicio, y: s.yInicio },
    { x: s.xFin, y: s.yFin },
  ]);

  const xs = [0, stockXMin, stockXMax, ...puntos.map((p) => p.x)];
  const ys = [0, stockYMin, stockYMax, ...puntos.map((p) => p.y)];
  const minX = Math.min(...xs);
  const maxX = Math.max(1, ...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(1, ...ys);

  const escalaX = (ANCHO - 2 * PADDING) / (maxX - minX || 1);
  const escalaY = (ALTO - 2 * PADDING) / (maxY - minY || 1);
  const escala = Math.min(escalaX, escalaY);

  const proyX = (x) => PADDING + (x - minX) * escala;
  const proyY = (y) => ALTO - PADDING - (y - minY) * escala;

  const ultimo = segmentos.length ? segmentos[segmentos.length - 1] : null;

  return (
    <div ref={contenedorRef} className="w-full h-full">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="w-full h-full block">
        {tieneStock && (
          <rect
            x={proyX(stockXMin)}
            y={proyY(stockYMax)}
            width={proyX(stockXMax) - proyX(stockXMin)}
            height={proyY(stockYMin) - proyY(stockYMax)}
            fill="rgba(131, 207, 255, 0.08)"
            stroke="rgba(131, 207, 255, 0.35)"
            strokeDasharray="5 4"
            strokeWidth={1}
          />
        )}

        {segmentos.length === 0 ? (
          <text x={ANCHO / 2} y={ALTO / 2} textAnchor="middle" fontSize="14" fill="#87929b">
            Ejecuta el código para ver la trayectoria
          </text>
        ) : (
          segmentos.map((s, i) => (
            <line
              key={i}
              x1={proyX(s.xInicio)}
              y1={proyY(s.yInicio)}
              x2={proyX(s.xFin)}
              y2={proyY(s.yFin)}
              stroke={colorTrazo(s.tipo)}
              strokeWidth={s.tipo === "RAPIDO" ? 1.5 : 2.5}
              strokeDasharray={s.tipo === "RAPIDO" ? "6 4" : undefined}
            />
          ))
        )}
        {ultimo && (
          <circle cx={proyX(ultimo.xFin)} cy={proyY(ultimo.yFin)} r={4} fill="#83cfff" className="animate-pulse" />
        )}
      </svg>
      {colisionDetectada && (
        <p className="absolute bottom-3 left-3 text-label-sm font-label-sm text-error bg-surface-container border border-error/40 rounded px-3 py-1.5">
          ⚠ Trayectoria fuera de los límites de la pieza (posible colisión).
        </p>
      )}
    </div>
  );
}
