package com.tornotech.lms.model;

/**
 * Estrategia de mecanizado que se espera que el alumno use en un ejercicio (criterio 3 de
 * ValidacionService: "uso correcto de codigos/estrategia esperada"). Opcional por ejercicio.
 */
public enum EstrategiaEsperada {
    /** Sin restriccion de estrategia: solo se valida colision/sintaxis y dimension final. */
    LIBRE,
    /** El alumno debe llegar al diametro objetivo solo con movimientos lineales (G01). */
    PUNTO_A_PUNTO,
    /** El alumno debe usar interpolacion circular (G02/G03) en algun tramo del programa. */
    INTERPOLACION_CIRCULAR
}
