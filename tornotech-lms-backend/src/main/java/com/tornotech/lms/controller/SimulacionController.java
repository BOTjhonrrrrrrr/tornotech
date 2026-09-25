package com.tornotech.lms.controller;

import com.tornotech.lms.dto.SimularRequest;
import com.tornotech.lms.model.Ejercicio;
import com.tornotech.lms.repository.EjercicioRepository;
import com.tornotech.lms.simulacion.IsoInterpreterService;
import com.tornotech.lms.simulacion.ResultadoSimulacionDTO;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Pantalla "Simulador CNC": ejecuta el codigo ISO contra la pieza del ejercicio
 * y devuelve la trayectoria 2D + errores, sin persistir nada (RF-07 a RF-12).
 * Para guardar el intento formalmente, usar IntentoController.
 */
@RestController
@RequestMapping("/api/simulacion")
public class SimulacionController {

    private final EjercicioRepository ejercicioRepository;
    private final IsoInterpreterService isoInterpreterService;

    public SimulacionController(EjercicioRepository ejercicioRepository, IsoInterpreterService isoInterpreterService) {
        this.ejercicioRepository = ejercicioRepository;
        this.isoInterpreterService = isoInterpreterService;
    }

    @PostMapping("/ejecutar")
    public ResultadoSimulacionDTO ejecutar(@Valid @RequestBody SimularRequest request) {
        Ejercicio ejercicio = ejercicioRepository.findById(request.ejercicioId())
                .orElseThrow(() -> new RuntimeException("Ejercicio no encontrado"));

        return isoInterpreterService.simular(request.codigoIso(), ejercicio.getPieza(), ejercicio.getMaquina(),
                request.stockDiametro(), request.stockLongitud(), request.stockAncho(), request.stockAlto());
    }
}
