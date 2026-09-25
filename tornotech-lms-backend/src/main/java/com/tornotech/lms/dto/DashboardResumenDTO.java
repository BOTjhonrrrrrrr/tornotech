package com.tornotech.lms.dto;

/** Datos agregados para la pantalla "Dashboard" (RF-17). */
public record DashboardResumenDTO(
        long totalUsuarios,
        long totalEjercicios,
        long totalIntentos,
        long certificacionesVigentes,
        long certificacionesPorVencer,
        long certificacionesVencidas
) {
}
