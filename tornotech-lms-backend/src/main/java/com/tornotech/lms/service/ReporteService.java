package com.tornotech.lms.service;

import com.tornotech.lms.dto.ActividadUsuarioDTO;
import com.tornotech.lms.dto.DashboardResumenDTO;
import com.tornotech.lms.model.Certificacion;
import com.tornotech.lms.model.Intento;
import com.tornotech.lms.model.Usuario;
import com.tornotech.lms.repository.*;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

/**
 * Agregados para las pantallas "Dashboard" y "Reportes" (RF-17).
 * Implementacion simple con conteos en memoria: adecuada para la escala objetivo (~50 usuarios).
 * Si el volumen crece, mover estos conteos a consultas JPQL/@Query dedicadas.
 */
@Service
public class ReporteService {

    private static final int DIAS_ALERTA_VENCIMIENTO = 30;

    private final UsuarioRepository usuarioRepository;
    private final EjercicioRepository ejercicioRepository;
    private final IntentoRepository intentoRepository;
    private final CertificacionRepository certificacionRepository;

    public ReporteService(UsuarioRepository usuarioRepository, EjercicioRepository ejercicioRepository,
                           IntentoRepository intentoRepository, CertificacionRepository certificacionRepository) {
        this.usuarioRepository = usuarioRepository;
        this.ejercicioRepository = ejercicioRepository;
        this.intentoRepository = intentoRepository;
        this.certificacionRepository = certificacionRepository;
    }

    public DashboardResumenDTO resumenDashboard() {
        List<Certificacion> certificaciones = certificacionRepository.findAll();
        LocalDate hoy = LocalDate.now();
        LocalDate limiteAlerta = hoy.plusDays(DIAS_ALERTA_VENCIMIENTO);

        long vencidas = certificaciones.stream().filter(c -> c.getFechaVencimiento().isBefore(hoy)).count();
        long porVencer = certificaciones.stream()
                .filter(c -> !c.getFechaVencimiento().isBefore(hoy) && c.getFechaVencimiento().isBefore(limiteAlerta))
                .count();
        long vigentes = certificaciones.size() - vencidas - porVencer;

        return new DashboardResumenDTO(
                usuarioRepository.count(),
                ejercicioRepository.count(),
                intentoRepository.count(),
                vigentes,
                porVencer,
                vencidas
        );
    }

    /** RF-16: certificaciones que vencen dentro de DIAS_ALERTA_VENCIMIENTO dias, para notificar. */
    public List<Certificacion> certificacionesPorVencer() {
        LocalDate hoy = LocalDate.now();
        LocalDate limite = hoy.plusDays(DIAS_ALERTA_VENCIMIENTO);
        return certificacionRepository.findAll().stream()
                .filter(c -> !c.getFechaVencimiento().isBefore(hoy) && c.getFechaVencimiento().isBefore(limite))
                .toList();
    }

    /**
     * Panel "Actividad en la plataforma" del dashboard del aprendiz. V1 deliberadamente simple:
     * no hay tracker de sesiones/tiempo activo todavia (ver ActividadUsuarioDTO), asi que se
     * muestran metricas reales que ya se pueden derivar de los datos existentes.
     */
    public ActividadUsuarioDTO actividadUsuario(Long usuarioId) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        List<Intento> intentos = intentoRepository.findByUsuarioId(usuarioId);
        var ultimo = intentos.stream().map(Intento::getFechaEnvio).max(Comparator.naturalOrder()).orElse(null);
        return new ActividadUsuarioDTO(usuario.getFechaCreacion(), intentos.size(), ultimo);
    }
}
