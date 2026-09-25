package com.tornotech.lms.dto;

import java.time.LocalDateTime;

/**
 * Actividad de un usuario en la plataforma (panel del aprendiz en el Dashboard). Deliberadamente
 * simple (V1): no hay un tracker de sesiones/tiempo activo todavia, asi que se muestran metricas
 * reales derivadas de datos que ya existen (fecha de alta, intentos enviados) en vez de inventar
 * un numero de "tiempo activo" que no se esta midiendo de verdad.
 */
public record ActividadUsuarioDTO(
        LocalDateTime fechaCreacion,
        long totalIntentos,
        LocalDateTime ultimoIntento
) {
}
