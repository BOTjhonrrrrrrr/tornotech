package com.tornotech.lms.controller;

import com.tornotech.lms.dto.EnviarIntentoRequest;
import com.tornotech.lms.model.Intento;
import com.tornotech.lms.repository.IntentoRepository;
import com.tornotech.lms.security.UsuarioActualService;
import com.tornotech.lms.service.IntentoService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

/** Intentos enviados desde el Simulador CNC (RF-13). */
@RestController
@RequestMapping("/api/intentos")
public class IntentoController {

    // Mismo criterio que ReporteController: un APRENDIZ solo puede ver sus propios intentos;
    // estos roles pueden ver los de cualquiera (supervision).
    private static final Set<String> ROLES_SUPERVISION = Set.of("ADMINISTRADOR", "INSTRUCTOR", "OBSERVADOR");

    private final IntentoService intentoService;
    private final IntentoRepository intentoRepository;
    private final UsuarioActualService usuarioActualService;

    public IntentoController(IntentoService intentoService, IntentoRepository intentoRepository,
                              UsuarioActualService usuarioActualService) {
        this.intentoService = intentoService;
        this.intentoRepository = intentoRepository;
        this.usuarioActualService = usuarioActualService;
    }

    @PostMapping
    public Intento enviar(@Valid @RequestBody EnviarIntentoRequest request) {
        return intentoService.registrarIntento(request.usuarioId(), request.ejercicioId(), request.codigoIso());
    }

    // Antes no verificaba nada: un APRENDIZ autenticado podia leer los intentos (codigo enviado,
    // errores) de CUALQUIER otro usuario con solo cambiar el {usuarioId} en la URL. Mismo bug de
    // escalacion horizontal que ya se habia corregido en ReporteController, no detectado antes
    // porque este endpoint no se llama desde el frontend actual, pero seguia expuesto en la API.
    @GetMapping("/usuario/{usuarioId}")
    public List<Intento> porUsuario(@PathVariable Long usuarioId) {
        usuarioActualService.verificarAccesoUsuario(usuarioId, ROLES_SUPERVISION);
        return intentoRepository.findByUsuarioId(usuarioId);
    }

    // Esta vista es "todos los intentos de un ejercicio" (multiples usuarios a la vez), no hay un
    // "dueño" individual que comparar -- se restringe directamente a roles de supervision.
    @GetMapping("/ejercicio/{ejercicioId}")
    public List<Intento> porEjercicio(@PathVariable Long ejercicioId) {
        if (!ROLES_SUPERVISION.contains(usuarioActualService.obtener().getRol().name())) {
            throw new RuntimeException("No tienes permiso para ver los intentos de este ejercicio");
        }
        return intentoRepository.findByEjercicioId(ejercicioId);
    }
}
