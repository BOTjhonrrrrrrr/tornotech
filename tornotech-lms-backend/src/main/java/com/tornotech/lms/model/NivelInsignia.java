package com.tornotech.lms.model;

/**
 * Insignia de nivel que agrupa ejercicios (RF-15 rediseñado): en vez de un certificado por cada
 * ejercicio aprobado, se emite una constancia al completar UMBRAL_APROBADOS ejercicios distintos
 * de ese nivel (ver EvaluacionService). La clasificacion es automatica por maquina+dificultad:
 * TORNO_BASICO = TORNO_CNC + BASICO, TORNO_INTERMEDIO = TORNO_CNC + INTERMEDIO,
 * FRESADO = cualquier FRESADORA_CNC (no se divide por dificultad, a diferencia de torno).
 * Ejercicios de TORNO_CNC + AVANZADO no mapean a ninguna insignia todavia -- no hay un nivel
 * "Torno Avanzado" definido aun.
 */
public enum NivelInsignia {
    TORNO_BASICO,
    TORNO_INTERMEDIO,
    FRESADO
}
