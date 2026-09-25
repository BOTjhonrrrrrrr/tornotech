package com.tornotech.lms.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "usuario")
@Getter
@Setter
@NoArgsConstructor
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nombre;

    @Column(nullable = false, unique = true)
    private String email;

    // WRITE_ONLY (no JsonIgnore): UsuarioController.crear() todavia necesita recibir la contraseña
    // en este campo desde el JSON de entrada, pero nunca debe salir en una respuesta. Sin esto,
    // cualquier endpoint que serialice un Usuario anidado (Ejercicio.instructor, Intento.usuario, etc.)
    // exponia el hash de la contraseña en la respuesta JSON.
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Rol rol;

    @ManyToOne
    @JoinColumn(name = "grupo_id")
    private Grupo grupo;

    @Column(nullable = false)
    private boolean activo = true;

    // Nullable a proposito: cuentas creadas ANTES de este campo quedan con fechaCreacion = null
    // (ddl-auto=update solo agrega la columna, no puede rellenar el pasado). El dashboard del
    // aprendiz lo muestra como "-" cuando no esta disponible en vez de asumir una fecha falsa.
    @Column(name = "fecha_creacion")
    private LocalDateTime fechaCreacion = LocalDateTime.now();
}
