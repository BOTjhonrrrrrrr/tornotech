package com.tornotech.lms.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/** Constancia de aprobacion con vigencia, derivada de una evaluacion (RF-15, RF-16). */
// Indice: MisCertificados.jsx y el dashboard consultan por usuario_id en cada carga
// (CertificacionRepository.findByUsuarioId).
@Entity
@Table(name = "certificacion", indexes = {
        @Index(name = "idx_certificacion_usuario", columnList = "usuario_id")
})
@Getter
@Setter
@NoArgsConstructor
public class Certificacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    // La evaluacion que completo el nivel (el N-esimo ejercicio aprobado que alcanzo el umbral),
    // no "el unico ejercicio que representa toda la insignia" -- se conserva como referencia de
    // cuando/por que intento se emitio, igual que antes cuando era 1 certificado por ejercicio.
    @OneToOne
    @JoinColumn(name = "evaluacion_id", nullable = false, unique = true)
    private Evaluacion evaluacion;

    // Nullable a proposito: las certificaciones emitidas ANTES de este cambio (una por ejercicio
    // aprobado) quedan con nivel = null y se siguen mostrando como "certificados anteriores" en
    // MisCertificados.jsx. Toda certificacion nueva sí trae nivel (ver EvaluacionService).
    @Enumerated(EnumType.STRING)
    @Column(name = "nivel")
    private NivelInsignia nivel;

    @Column(name = "fecha_emision", nullable = false)
    private LocalDate fechaEmision = LocalDate.now();

    @Column(name = "fecha_vencimiento", nullable = false)
    private LocalDate fechaVencimiento;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoCertificacion estado = EstadoCertificacion.VIGENTE;
}
