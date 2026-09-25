package com.tornotech.lms.controller;

import com.tornotech.lms.dto.LoginRequest;
import com.tornotech.lms.dto.LoginResponse;
import com.tornotech.lms.model.Usuario;
import com.tornotech.lms.repository.UsuarioRepository;
import com.tornotech.lms.security.JwtUtil;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthController(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        Usuario usuario = usuarioRepository.findByEmail(request.email())
                .orElseThrow(() -> new RuntimeException("Credenciales invalidas"));

        if (!usuario.isActivo() || !passwordEncoder.matches(request.password(), usuario.getPasswordHash())) {
            throw new RuntimeException("Credenciales invalidas");
        }

        String token = jwtUtil.generarToken(usuario.getEmail(), usuario.getRol().name());
        return new LoginResponse(token, usuario.getId(), usuario.getNombre(), usuario.getRol().name());
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> credencialesInvalidas(RuntimeException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", ex.getMessage()));
    }
}
