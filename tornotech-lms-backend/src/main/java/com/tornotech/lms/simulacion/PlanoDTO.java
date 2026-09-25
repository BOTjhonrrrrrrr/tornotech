package com.tornotech.lms.simulacion;

/**
 * Respuesta de GET /api/ejercicios/{id}/plano. "disponible" es false cuando el instructor no
 * definio ni una imagen de plano ni Ejercicio.codigoReferencia -- en ese caso el frontend muestra
 * un mensaje en vez del dibujo. Cuando hay imagenBase64 (subida desde un CAD), el frontend la
 * muestra directamente y tiene prioridad sobre "simulacion". Cuando no hay imagen pero si
 * codigoReferencia, "simulacion" trae la geometria YA CALCULADA a partir de simular ese codigo
 * server-side; el codigo fuente en si nunca sale de aqui (ver Ejercicio.codigoReferencia, WRITE_ONLY).
 */
public record PlanoDTO(boolean disponible, ResultadoSimulacionDTO simulacion, String imagenBase64) {

    public static PlanoDTO noDisponible() {
        return new PlanoDTO(false, null, null);
    }
}
