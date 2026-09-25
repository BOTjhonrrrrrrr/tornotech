package com.tornotech.lms.controller;

import com.tornotech.lms.model.Pieza;
import com.tornotech.lms.model.TipoMaquina;
import com.tornotech.lms.repository.PiezaRepository;
import com.tornotech.lms.service.GeneradorPiezaService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Piezas de practica, incluyendo el generador aleatorio (RF-05). */
@RestController
@RequestMapping("/api/piezas")
public class PiezaController {

    private final PiezaRepository piezaRepository;
    private final GeneradorPiezaService generadorPiezaService;

    public PiezaController(PiezaRepository piezaRepository, GeneradorPiezaService generadorPiezaService) {
        this.piezaRepository = piezaRepository;
        this.generadorPiezaService = generadorPiezaService;
    }

    @GetMapping
    public List<Pieza> listar() {
        return piezaRepository.findAll();
    }

    @PostMapping
    public Pieza crearManual(@RequestBody Pieza pieza) {
        return piezaRepository.save(pieza);
    }

    /** RF-05: genera una pieza de practica aleatoria para la maquina indicada. */
    @PostMapping("/generar-aleatoria")
    public Pieza generarAleatoria(@RequestParam TipoMaquina maquina) {
        Pieza pieza = generadorPiezaService.generar(maquina);
        return piezaRepository.save(pieza);
    }
}
