package com.tornotech.lms.controller;

import com.tornotech.lms.model.Asignacion;
import com.tornotech.lms.repository.AsignacionRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Asignacion manual de ejercicios a empleados o grupos (RF-06), parte de "Gestion de instruccion". */
@RestController
@RequestMapping("/api/asignaciones")
public class AsignacionController {

    private final AsignacionRepository asignacionRepository;

    public AsignacionController(AsignacionRepository asignacionRepository) {
        this.asignacionRepository = asignacionRepository;
    }

    @PostMapping
    public Asignacion asignar(@RequestBody Asignacion asignacion) {
        if (asignacion.getUsuario() == null && asignacion.getGrupo() == null) {
            throw new RuntimeException("La asignacion debe indicar un usuario o un grupo");
        }
        return asignacionRepository.save(asignacion);
    }

    @GetMapping("/usuario/{usuarioId}")
    public List<Asignacion> porUsuario(@PathVariable Long usuarioId) {
        return asignacionRepository.findByUsuarioId(usuarioId);
    }

    @GetMapping("/grupo/{grupoId}")
    public List<Asignacion> porGrupo(@PathVariable Long grupoId) {
        return asignacionRepository.findByGrupoId(grupoId);
    }

    @GetMapping("/ejercicio/{ejercicioId}")
    public List<Asignacion> porEjercicio(@PathVariable Long ejercicioId) {
        return asignacionRepository.findByEjercicioId(ejercicioId);
    }

    @DeleteMapping("/{id}")
    public void quitar(@PathVariable Long id) {
        asignacionRepository.deleteById(id);
    }
}
