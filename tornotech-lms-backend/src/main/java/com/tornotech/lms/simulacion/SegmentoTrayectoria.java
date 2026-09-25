package com.tornotech.lms.simulacion;

/**
 * Un segmento de la trayectoria 2D calculada (RF-10). Coordenadas en mm.
 * tipo: "RAPIDO" (G00), "LINEAL" (G01) o "ARCO" (G02/G03).
 */
public record SegmentoTrayectoria(
        double xInicio, double yInicio,
        double xFin, double yFin,
        String tipo,
        int lineaOrigen
) {
}
