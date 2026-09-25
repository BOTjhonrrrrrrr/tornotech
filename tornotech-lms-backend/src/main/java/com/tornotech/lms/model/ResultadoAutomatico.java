package com.tornotech.lms.model;

/**
 * Veredicto del ValidacionService para un Intento. Solo APROBADO se automatiza por completo (emite
 * Evaluacion+Certificacion sin intervencion humana); RECHAZADO y PENDIENTE_REVISION siguen apareciendo
 * en la bandeja de calificacion del instructor (con este veredicto como sugerencia), para no fallar
 * a un alumno de forma irreversible por un falso positivo del motor simplificado.
 */
public enum ResultadoAutomatico {
    /** Cumple los 3 criterios: se emite Evaluacion+Certificacion automaticamente. */
    APROBADO,
    /** Colision o error de sintaxis detectado: sugerencia de rechazo, el instructor confirma. */
    RECHAZADO,
    /** Sin colision/sintaxis, pero la dimension/estrategia no se pudo verificar (o el ejercicio no
     * define criterios de validacion automatica): requiere revision manual. */
    PENDIENTE_REVISION
}
