package com.tornotech.lms.dto;

import com.tornotech.lms.model.EstadoEvaluacion;
import com.tornotech.lms.model.ResultadoAutomatico;
import com.tornotech.lms.model.TipoMaquina;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Vista combinada de un Intento + su ResultadoSimulacion + su Evaluacion (si ya existe), para la
 * pantalla de calificacion del instructor (RF-14). evaluacionId/estadoEvaluacion/comentarios quedan
 * null cuando el intento todavia esta pendiente de revision. resultadoAutomatico/detalleValidacion
 * son la sugerencia de ValidacionService (null si el ejercicio no tiene criterios configurados).
 */
public record IntentoRevisionDTO(
        Long intentoId,
        Long usuarioId,
        String usuarioNombre,
        String usuarioEmail,
        Long ejercicioId,
        String ejercicioTitulo,
        TipoMaquina maquina,
        String codigoIso,
        LocalDateTime fechaEnvio,
        String errores,           // JSON: List<ErrorPrograma>
        boolean colisionDetectada,
        String trayectoria2D,     // JSON: List<SegmentoTrayectoria>
        ResultadoAutomatico resultadoAutomatico,
        String detalleValidacion, // JSON: ValidacionService.DetalleValidacion
        Long evaluacionId,
        EstadoEvaluacion estadoEvaluacion,
        String comentarios,
        LocalDate fechaEvaluacion
) {
}
