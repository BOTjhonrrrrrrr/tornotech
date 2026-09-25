package com.tornotech.lms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Envio formal de un intento (RF-13). usuarioId es explicito por ahora;
 * en produccion conviene tomarlo del JWT (SecurityContext) en vez de confiar en el body.
 */
public record EnviarIntentoRequest(
        @NotNull Long usuarioId,
        @NotNull Long ejercicioId,
        @NotBlank String codigoIso
) {
}
