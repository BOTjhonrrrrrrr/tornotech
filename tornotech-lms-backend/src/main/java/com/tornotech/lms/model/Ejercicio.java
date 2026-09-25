package com.tornotech.lms.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "ejercicio")
@Getter
@Setter
@NoArgsConstructor
public class Ejercicio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String titulo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoMaquina maquina;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Dificultad dificultad;

    @ManyToOne
    @JoinColumn(name = "pieza_id", nullable = false)
    private Pieza pieza;

    @ManyToOne
    @JoinColumn(name = "instructor_id", nullable = false)
    private Usuario instructor;

    // Sin @Lob a proposito: en Hibernate 6 + PostgreSQL, @Lob en un String suele mapear a "oid"
    // (Large Object real, con streaming), no a "text" plano -- y leerlo fuera de la transaccion
    // original (aqui open-in-view=false) revienta con "Unable to access lob stream". TEXT explicito
    // evita todo el mecanismo de LOB: se lee como String normal, sin limite practico de tamaño.
    @Column(columnDefinition = "TEXT")
    private String descripcion;

    // --- Criterios de aprobacion automatica (opcionales; ver ValidacionService). Si diametroObjetivo
    // es null, el ejercicio no tiene validacion automatica y todo intento queda PENDIENTE_REVISION
    // (flujo manual de siempre). Modelo simplificado: un solo diametro objetivo sobre una longitud de
    // corte medida desde la cara libre (Z0), no un perfil escalonado completo — alcance reducido a
    // proposito para lo que cubre el motor actual (ver TornoTech_LMS_Diseno_Motor_Simulador.md).

    /** Diametro final esperado (mm) sobre el tramo de corte, en modo diametro (torno). */
    @Column(name = "diametro_objetivo")
    private Double diametroObjetivo;

    /** Longitud (mm) desde Z0 sobre la que debe cumplirse el diametroObjetivo. */
    @Column(name = "longitud_corte")
    private Double longitudCorte;

    /** Tolerancia dimensional aceptada (mm). */
    @Column(name = "tolerancia_mm")
    private Double toleranciaMm = 0.2;

    /** Codigos ISO que deben aparecer en el programa, separados por coma (p. ej. "G02,G03"). */
    @Column(name = "codigos_requeridos")
    private String codigosRequeridos;

    /** Codigos ISO que no deben aparecer en el programa, separados por coma (p. ej. "G00"). */
    @Column(name = "codigos_prohibidos")
    private String codigosProhibidos;

    @Enumerated(EnumType.STRING)
    @Column(name = "estrategia_esperada")
    private EstrategiaEsperada estrategiaEsperada = EstrategiaEsperada.LIBRE;

    /**
     * Codigo ISO "solucion" del instructor (opcional). Se simula server-side (ver
     * EjercicioController.plano) para generar el plano tecnico que ve el alumno -- NUNCA se
     * expone tal cual en una respuesta JSON (WRITE_ONLY, mismo patron que Usuario.passwordHash),
     * porque eso equivaldria a entregarle la respuesta del ejercicio a cualquier APRENDIZ que
     * inspeccione las llamadas de red. Solo el geometria calculada (trayectoria) llega al frontend.
     */
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Column(name = "codigo_referencia", columnDefinition = "TEXT")
    private String codigoReferencia;

    /**
     * Plano de manufactura como imagen (data URI completa, p. ej. "data:image/png;base64,...."),
     * subida por el instructor desde un CAD externo. Alternativa opcional al plano generado
     * automaticamente a partir de codigoReferencia (ver EjercicioController.plano): si esta imagen
     * esta presente, el simulador la muestra en vez de la geometria simulada. A diferencia de
     * codigoReferencia, esto SI se devuelve en las respuestas normales (no es una respuesta a
     * ocultar, es un dibujo de referencia que el alumno debe poder ver).
     */
    @Column(name = "plano_imagen_base64", columnDefinition = "TEXT")
    private String planoImagenBase64;
}
