package com.tornotech.lms.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

/**
 * Geometria base de practica. El campo parametrosGeneracion guarda en JSON
 * los parametros usados por el generador aleatorio de piezas (RF-05).
 */
@Entity
@Table(name = "pieza")
@Getter
@Setter
@NoArgsConstructor
public class Pieza {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "geometria_base", nullable = false)
    private String geometriaBase;

    @Column(nullable = false)
    private String dimensiones;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoMaquina maquina;

    // Sin @Lob (ver Ejercicio.descripcion para la explicacion del bug que evita)
    @Column(name = "parametros_generacion", columnDefinition = "TEXT")
    private String parametrosGeneracion; // JSON

    @Column(name = "generada_automaticamente")
    private boolean generadaAutomaticamente = false;
}
