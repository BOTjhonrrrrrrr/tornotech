package com.tornotech.lms.controller;

import com.tornotech.lms.dto.ActividadUsuarioDTO;
import com.tornotech.lms.dto.DashboardResumenDTO;
import com.tornotech.lms.dto.ProgresoInsigniaDTO;
import com.tornotech.lms.model.Certificacion;
import com.tornotech.lms.repository.CertificacionRepository;
import com.tornotech.lms.repository.IntentoRepository;
import com.tornotech.lms.security.UsuarioActualService;
import com.tornotech.lms.service.EvaluacionService;
import com.tornotech.lms.service.ReporteService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Set;

/** Datos para las pantallas "Dashboard" y "Reportes" (RF-17). */
@RestController
@RequestMapping("/api/reportes")
public class ReporteController {

    // Roles que pueden consultar el progreso/certificaciones de CUALQUIER usuario (supervision).
    // Un APRENDIZ solo puede consultar las suyas propias -- ver UsuarioActualService.
    private static final Set<String> ROLES_SUPERVISION = Set.of("ADMINISTRADOR", "INSTRUCTOR", "OBSERVADOR");

    private final ReporteService reporteService;
    private final IntentoRepository intentoRepository;
    private final CertificacionRepository certificacionRepository;
    private final UsuarioActualService usuarioActualService;
    private final EvaluacionService evaluacionService;

    public ReporteController(ReporteService reporteService, IntentoRepository intentoRepository,
                              CertificacionRepository certificacionRepository, UsuarioActualService usuarioActualService,
                              EvaluacionService evaluacionService) {
        this.reporteService = reporteService;
        this.intentoRepository = intentoRepository;
        this.certificacionRepository = certificacionRepository;
        this.usuarioActualService = usuarioActualService;
        this.evaluacionService = evaluacionService;
    }

    @GetMapping("/dashboard")
    public DashboardResumenDTO dashboard() {
        return reporteService.resumenDashboard();
    }

    @GetMapping("/certificaciones/por-vencer")
    public List<Certificacion> certificacionesPorVencer() {
        return reporteService.certificacionesPorVencer();
    }

    // SecurityConfig ya abrio estos dos endpoints a APRENDIZ (ademas de los roles de supervision)
    // para que cualquiera vea su propio progreso/certificados -- sin este chequeo, un APRENDIZ
    // podria leer los datos de OTRO usuario con solo cambiar el {usuarioId} en la URL.
    @GetMapping("/progreso/usuario/{usuarioId}")
    public Object progresoUsuario(@PathVariable Long usuarioId) {
        usuarioActualService.verificarAccesoUsuario(usuarioId, ROLES_SUPERVISION);
        return intentoRepository.findByUsuarioId(usuarioId);
    }

    @GetMapping("/certificaciones/usuario/{usuarioId}")
    public List<Certificacion> certificacionesUsuario(@PathVariable Long usuarioId) {
        usuarioActualService.verificarAccesoUsuario(usuarioId, ROLES_SUPERVISION);
        return certificacionRepository.findByUsuarioId(usuarioId);
    }

    /** Insignias por nivel (RF-15 rediseñado): progreso (aprobados/10) y estado de cada una. */
    @GetMapping("/insignias/usuario/{usuarioId}")
    public List<ProgresoInsigniaDTO> insigniasUsuario(@PathVariable Long usuarioId) {
        usuarioActualService.verificarAccesoUsuario(usuarioId, ROLES_SUPERVISION);
        return evaluacionService.progresoInsignias(usuarioId);
    }

    /** Panel de actividad del dashboard del aprendiz (fecha de alta, intentos enviados). */
    @GetMapping("/actividad/usuario/{usuarioId}")
    public ActividadUsuarioDTO actividadUsuario(@PathVariable Long usuarioId) {
        usuarioActualService.verificarAccesoUsuario(usuarioId, ROLES_SUPERVISION);
        return reporteService.actividadUsuario(usuarioId);
    }
}
