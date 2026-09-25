package com.tornotech.lms.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** Cada envio de codigo ISO de un empleado para un ejercicio (RF-13). */
// Indices sobre usuario_id/ejercicio_id: IntentoRepository.findByUsuarioId/findByEjercicioId y el
// listado "pendientes de calificacion" (CalificarIntentos.jsx) filtran por estas columnas seguido.
@Entity
@Table(name = "intento", indexes = {
        @Index(name = "idx_intento_usuario", columnList = "usuario_id"),
        @Index(name = "idx_intento_ejercicio", columnList = "ejercicio_id")
})
@Getter
@Setter
@NoArgsConstructor
public class Intento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @ManyToOne
    @JoinColumn(name = "ejercicio_id", nullable = false)
    private Ejercicio ejercicio;

    // Sin @Lob en estos tres campos (ver Ejercicio.descripcion para la explicacion del bug que evita)
    @Column(name = "codigo_iso", nullable = false, columnDefinition = "TEXT")
    private String codigoIso;

    @Column(name = "fecha_envio", nullable = false)
    private LocalDateTime fechaEnvio = LocalDateTime.now();

    @Column(columnDefinition = "TEXT")
    private String errores; // JSON con lista de errores de sintaxis/colision (RF-09)

    /** Veredicto de ValidacionService (informativo; ver ResultadoAutomatico). Null si el ejercicio
     * no define criterios de validacion automatica. */
    @Enumerated(EnumType.STRING)
    @Column(name = "resultado_automatico")
    private ResultadoAutomatico resultadoAutomatico;

    /** Detalle por criterio (colision/sintaxis, dimension, codigos/estrategia), en JSON. */
    @Column(name = "detalle_validacion", columnDefinition = "TEXT")
    private String detalleValidacionJson;
}
