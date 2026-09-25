package com.tornotech.lms.controller;

import com.tornotech.lms.model.Grupo;
import com.tornotech.lms.repository.GrupoRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/grupos")
public class GrupoController {

    private final GrupoRepository grupoRepository;

    public GrupoController(GrupoRepository grupoRepository) {
        this.grupoRepository = grupoRepository;
    }

    @GetMapping
    public List<Grupo> listar() {
        return grupoRepository.findAll();
    }

    @PostMapping
    public Grupo crear(@RequestBody Grupo grupo) {
        return grupoRepository.save(grupo);
    }

    @DeleteMapping("/{id}")
    public void eliminar(@PathVariable Long id) {
        grupoRepository.deleteById(id);
    }
}
