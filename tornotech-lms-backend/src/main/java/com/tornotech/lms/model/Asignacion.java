package com.tornotech.lms.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Asignacion manual de un ejercicio (RF-06) a un usuario individual y/o a un grupo.
 * Al menos uno de usuario/grupo debe estar presente.
 */
// Indices: AsignacionController expone consultas por usuario, por grupo y por ejercicio
// (findByUsuarioId/findByGrupoId/findByEjercicioId), y EjercicioController.asignados() combina las
// tres seguido para resolver que ve cada APRENDIZ en el Simulador CNC.
@Entity
@Table(name = "asignacion", indexes = {
        @Index(name = "idx_asignacion_usuario", columnList = "usuario_id"),
        @Index(name = "idx_asignacion_grupo", columnList = "grupo_id"),
        @Index(name = "idx_asignacion_ejercicio", columnList = "ejercicio_id")
})
@Getter
@Setter
@NoArgsConstructor
public class Asignacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "ejercicio_id", nullable = false)
    private Ejercicio ejercicio;

    @ManyToOne
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @ManyToOne
    @JoinColumn(name = "grupo_id")
    private Grupo grupo;

    @Column(name = "fecha_asignacion", nullable = false)
    private LocalDate fechaAsignacion = LocalDate.now();
}
