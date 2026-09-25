package com.tornotech.lms.dto;

import com.tornotech.lms.model.EstadoEvaluacion;
import jakarta.validation.constraints.NotNull;

/** Calificacion de un intento por el instructor (RF-14). */
public record CalificarRequest(
        @NotNull Long intentoId,
        @NotNull Long calificadoPorId,
        @NotNull EstadoEvaluacion estado,
        String comentarios
) {
}
