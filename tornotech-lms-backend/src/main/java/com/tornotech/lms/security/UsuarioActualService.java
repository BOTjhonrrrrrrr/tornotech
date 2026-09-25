package com.tornotech.lms.security;

import com.tornotech.lms.model.Usuario;
import com.tornotech.lms.repository.UsuarioRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * Resuelve el Usuario autenticado a partir del email guardado como principal por JwtAuthFilter, y
 * centraliza la regla "un usuario solo puede ver SUS PROPIOS datos, salvo que tenga un rol de
 * supervision" para no reimplementarla (o peor, olvidarla) en cada controller que exponga un
 * endpoint tipo /recurso/usuario/{usuarioId}.
 */
@Component
public class UsuarioActualService {

    private final UsuarioRepository usuarioRepository;

    public UsuarioActualService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    public Usuario obtener() {
        String email = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    /**
     * Lanza RuntimeException (400, ver GlobalExceptionHandler) si el usuario autenticado no es
     * ni el dueño de usuarioId ni tiene uno de los rolesConAccesoTotal.
     */
    public void verificarAccesoUsuario(Long usuarioId, Set<String> rolesConAccesoTotal) {
        Usuario actual = obtener();
        boolean tieneAccesoTotal = rolesConAccesoTotal.contains(actual.getRol().name());
        boolean esSuPropioUsuario = actual.getId().equals(usuarioId);

        if (!tieneAccesoTotal && !esSuPropioUsuario) {
            throw new RuntimeException("No tienes permiso para ver los datos de este usuario");
        }
    }
}
