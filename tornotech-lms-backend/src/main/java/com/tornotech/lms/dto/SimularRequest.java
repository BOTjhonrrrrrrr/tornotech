package com.tornotech.lms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Peticion para probar codigo ISO en vivo, sin guardar intento (RF-11: feedback en tiempo real).
 * Los campos stock* son opcionales: permiten que el alumno defina manualmente las dimensiones
 * de la pieza en bruto en el simulador (para visualizar limites/colision) sin modificar la pieza
 * real asignada al ejercicio. Si se omiten, se usan las dimensiones de la pieza del ejercicio.
 */
public record SimularRequest(
        @NotNull Long ejercicioId,
        @NotBlank String codigoIso,
        Double stockDiametro,
        Double stockLongitud,
        Double stockAncho,
        Double stockAlto
) {
}
