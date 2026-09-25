package com.tornotech.lms.controller;

import com.tornotech.lms.dto.CalificarRequest;
import com.tornotech.lms.dto.IntentoRevisionDTO;
import com.tornotech.lms.model.Evaluacion;
import com.tornotech.lms.service.EvaluacionService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/evaluaciones")
public class EvaluacionController {

    private final EvaluacionService evaluacionService;

    public EvaluacionController(EvaluacionService evaluacionService) {
        this.evaluacionService = evaluacionService;
    }

    /** Bandeja de calificacion: intentos enviados sin evaluar aun (RF-14). */
    @GetMapping("/pendientes")
    public List<IntentoRevisionDTO> pendientes() {
        return evaluacionService.listarPendientes();
    }

    /** Historial de intentos ya calificados (RF-14). */
    @GetMapping("/historial")
    public List<IntentoRevisionDTO> historial() {
        return evaluacionService.listarHistorial();
    }

    @PostMapping("/calificar")
    public Evaluacion calificar(@Valid @RequestBody CalificarRequest request) {
        return evaluacionService.calificar(request.intentoId(), request.calificadoPorId(),
                request.estado(), request.comentarios());
    }
}
