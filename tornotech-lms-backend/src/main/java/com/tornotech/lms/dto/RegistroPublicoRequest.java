package com.tornotech.lms.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** Auto-registro publico (RF-01): siempre crea la cuenta con rol APRENDIZ, nunca lo que envie el cliente. */
public record RegistroPublicoRequest(
        @NotBlank String nombre,
        @NotBlank @Email String email,
        @NotBlank String password
) {
}
