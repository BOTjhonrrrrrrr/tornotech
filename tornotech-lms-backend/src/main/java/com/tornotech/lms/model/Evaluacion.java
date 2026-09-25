package com.tornotech.lms.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/** Calificacion de un intento por parte del instructor (RF-14). */
@Entity
@Table(name = "evaluacion")
@Getter
@Setter
@NoArgsConstructor
public class Evaluacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "intento_id", nullable = false, unique = true)
    private Intento intento;

    @ManyToOne
    @JoinColumn(name = "calificado_por", nullable = false)
    private Usuario calificadoPor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoEvaluacion estado = EstadoEvaluacion.PENDIENTE;

    @Column(nullable = false)
    private LocalDate fecha = LocalDate.now();

    private String comentarios;
}
