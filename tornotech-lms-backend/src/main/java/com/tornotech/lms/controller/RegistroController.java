package com.tornotech.lms.controller;

import com.tornotech.lms.dto.LoginResponse;
import com.tornotech.lms.dto.RegistroPublicoRequest;
import com.tornotech.lms.model.Rol;
import com.tornotech.lms.model.Usuario;
import com.tornotech.lms.repository.UsuarioRepository;
import com.tornotech.lms.security.JwtUtil;
import com.tornotech.lms.util.PasswordValidator;
import jakarta.validation.Valid;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Auto-registro publico de cuentas (RF-01). Deliberadamente en un controller separado de
 * AuthController: este ultimo tiene un @ExceptionHandler local que convierte cualquier
 * RuntimeException en 401 (pensado para "credenciales invalidas" del login), lo cual seria
 * incorrecto aqui -- un email duplicado o una contraseña que no cumple el estandar debe
 * responder 400 (lo resuelve GlobalExceptionHandler), no 401. Mapea al mismo prefijo /api/auth,
 * que ya esta en permitAll() en SecurityConfig.
 */
@RestController
@RequestMapping("/api/auth")
public class RegistroController {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public RegistroController(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    /** Crea una cuenta APRENDIZ (el rol nunca lo decide el cliente) y devuelve sesion iniciada. */
    @PostMapping("/registro")
    public LoginResponse registrar(@Valid @RequestBody RegistroPublicoRequest request) {
        String email = request.email().trim().toLowerCase();
        if (usuarioRepository.findByEmail(email).isPresent()) {
            throw new RuntimeException("Ya existe una cuenta con ese correo");
        }
        PasswordValidator.validar(request.password());

        Usuario usuario = new Usuario();
        usuario.setNombre(request.nombre().trim());
        usuario.setEmail(email);
        usuario.setPasswordHash(passwordEncoder.encode(request.password()));
        usuario.setRol(Rol.APRENDIZ);
        usuario.setActivo(true);
        usuario = usuarioRepository.save(usuario);

        String token = jwtUtil.generarToken(usuario.getEmail(), usuario.getRol().name());
        return new LoginResponse(token, usuario.getId(), usuario.getNombre(), usuario.getRol().name());
    }
}
