package com.tornotech.lms.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

/**
 * Salida del motor de simulacion 2D para un intento (RF-10, RF-11).
 * trayectoria2D guarda en JSON la secuencia de puntos/segmentos a renderizar.
 */
@Entity
@Table(name = "resultado_simulacion")
@Getter
@Setter
@NoArgsConstructor
public class ResultadoSimulacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "intento_id", nullable = false, unique = true)
    private Intento intento;

    // Sin @Lob (ver Ejercicio.descripcion para la explicacion del bug que evita)
    @Column(name = "trayectoria_2d", columnDefinition = "TEXT")
    private String trayectoria2D; // JSON

    @Column(name = "colision_detectada", nullable = false)
    private boolean colisionDetectada = false;

    @Column(name = "tiempo_simulado_segundos")
    private Double tiempoSimuladoSegundos;

    // Perfil remanente de material al final del intento (solo torno; ver IsoInterpreterService y
    // ValidacionService). JSON: List<PuntoPerfil>. Null si la maquina es fresadora o no hay stock.
    @Column(name = "perfil_final", columnDefinition = "TEXT")
    private String perfilFinalJson;
}
