package com.tornotech.lms.dto;

import com.tornotech.lms.model.Rol;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Alta de usuarios por un ADMINISTRADOR (RF-02). A diferencia del auto-registro publico,
 *  aqui si se puede elegir rol y grupo -- pero la contraseña pasa por el mismo PasswordValidator. */
public record CrearUsuarioRequest(
        @NotBlank String nombre,
        @NotBlank @Email String email,
        @NotBlank String password,
        @NotNull Rol rol,
        Long grupoId
) {
}
