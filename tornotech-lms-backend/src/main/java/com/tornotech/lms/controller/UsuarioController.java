package com.tornotech.lms.controller;

import com.tornotech.lms.dto.CrearUsuarioRequest;
import com.tornotech.lms.model.Grupo;
import com.tornotech.lms.model.Usuario;
import com.tornotech.lms.repository.GrupoRepository;
import com.tornotech.lms.repository.UsuarioRepository;
import com.tornotech.lms.util.PasswordValidator;
import jakarta.validation.Valid;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Gestion de usuarios y roles (RF-01, RF-02, RF-03).
 * Ver SecurityConfig: GET permitido tambien a INSTRUCTOR (necesita listar empleados para
 * asignarles ejercicios); crear/editar/desactivar siguen siendo solo ADMINISTRADOR.
 */
@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    private final UsuarioRepository usuarioRepository;
    private final GrupoRepository grupoRepository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioController(UsuarioRepository usuarioRepository, GrupoRepository grupoRepository,
                              PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.grupoRepository = grupoRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping
    public List<Usuario> listar() {
        return usuarioRepository.findAll();
    }

    @GetMapping("/{id}")
    public Usuario obtener(@PathVariable Long id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    /** Alta de un usuario por un ADMINISTRADOR: rol y grupo explicitos, password validado
     *  con el mismo estandar estricto que el auto-registro publico (PasswordValidator). */
    @PostMapping
    public Usuario crear(@Valid @RequestBody CrearUsuarioRequest request) {
        String email = request.email().trim().toLowerCase();
        if (usuarioRepository.findByEmail(email).isPresent()) {
            throw new RuntimeException("Ya existe una cuenta con ese correo");
        }
        PasswordValidator.validar(request.password());

        Usuario usuario = new Usuario();
        usuario.setNombre(request.nombre().trim());
        usuario.setEmail(email);
        usuario.setPasswordHash(passwordEncoder.encode(request.password()));
        usuario.setRol(request.rol());
        usuario.setActivo(true);

        if (request.grupoId() != null) {
            Grupo grupo = grupoRepository.findById(request.grupoId())
                    .orElseThrow(() -> new RuntimeException("Grupo no encontrado"));
            usuario.setGrupo(grupo);
        }

        return usuarioRepository.save(usuario);
    }

    @PutMapping("/{id}")
    public Usuario actualizar(@PathVariable Long id, @RequestBody Usuario cambios) {
        Usuario usuario = obtener(id);
        usuario.setNombre(cambios.getNombre());
        usuario.setRol(cambios.getRol());
        usuario.setGrupo(cambios.getGrupo());
        usuario.setActivo(cambios.isActivo());
        return usuarioRepository.save(usuario);
    }

    @DeleteMapping("/{id}")
    public void desactivar(@PathVariable Long id) {
        Usuario usuario = obtener(id);
        usuario.setActivo(false);
        usuarioRepository.save(usuario);
    }
}
