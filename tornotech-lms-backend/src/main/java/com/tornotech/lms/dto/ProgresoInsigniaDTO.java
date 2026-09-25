package com.tornotech.lms.dto;

import com.tornotech.lms.model.EstadoCertificacion;
import com.tornotech.lms.model.NivelInsignia;

import java.time.LocalDate;

/**
 * Progreso de un usuario hacia una insignia de nivel (ver EvaluacionService.progresoInsignias).
 * completado=false con aprobados&gt;0 es el caso "en progreso" que muestra la barra de avance en
 * MisCertificados.jsx / el dashboard del aprendiz; completado=true trae fechaEmision/fechaVencimiento.
 */
public record ProgresoInsigniaDTO(
        NivelInsignia nivel,
        long aprobados,
        int requeridos,
        boolean completado,
        LocalDate fechaEmision,
        LocalDate fechaVencimiento,
        EstadoCertificacion estado
) {
}
