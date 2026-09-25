package com.tornotech.lms.service;

import com.tornotech.lms.dto.IntentoRevisionDTO;
import com.tornotech.lms.dto.ProgresoInsigniaDTO;
import com.tornotech.lms.model.*;
import com.tornotech.lms.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class EvaluacionService {

    /** Vigencia por defecto de una certificacion (RF-15). Ajustar segun politica real de TornoTech. */
    private static final int MESES_VIGENCIA_CERTIFICACION = 12;

    /**
     * Insignias por nivel (rediseño de RF-15): ya no se emite un certificado por cada ejercicio
     * aprobado, sino una constancia unica al completar UMBRAL_APROBADOS ejercicios DISTINTOS de un
     * mismo nivel (ver NivelInsignia). 10 es el numero que se definio para las tres insignias
     * actuales (Torno Basico, Torno Intermedio, Fresado).
     */
    private static final int UMBRAL_APROBADOS = 10;

    private final EvaluacionRepository evaluacionRepository;
    private final IntentoRepository intentoRepository;
    private final UsuarioRepository usuarioRepository;
    private final CertificacionRepository certificacionRepository;
    private final ResultadoSimulacionRepository resultadoSimulacionRepository;

    public EvaluacionService(EvaluacionRepository evaluacionRepository,
                              IntentoRepository intentoRepository,
                              UsuarioRepository usuarioRepository,
                              CertificacionRepository certificacionRepository,
                              ResultadoSimulacionRepository resultadoSimulacionRepository) {
        this.evaluacionRepository = evaluacionRepository;
        this.intentoRepository = intentoRepository;
        this.usuarioRepository = usuarioRepository;
        this.certificacionRepository = certificacionRepository;
        this.resultadoSimulacionRepository = resultadoSimulacionRepository;
    }

    /**
     * Califica un intento y, si es APROBADO, emite automaticamente una certificacion (RF-14, RF-15).
     * @Transactional: si esto se llama desde IntentoService.registrarIntento (auto-aprobado), se une
     * a esa misma transaccion; llamado directamente (calificacion manual) abre la suya propia -- en
     * ambos casos Evaluacion y Certificacion se guardan como una sola unidad.
     */
    @Transactional
    public Evaluacion calificar(Long intentoId, Long calificadoPorId, EstadoEvaluacion estado, String comentarios) {
        Intento intento = intentoRepository.findById(intentoId)
                .orElseThrow(() -> new RuntimeException("Intento no encontrado"));
        Usuario calificador = usuarioRepository.findById(calificadoPorId)
                .orElseThrow(() -> new RuntimeException("Usuario calificador no encontrado"));

        Evaluacion evaluacion = new Evaluacion();
        evaluacion.setIntento(intento);
        evaluacion.setCalificadoPor(calificador);
        evaluacion.setEstado(estado);
        evaluacion.setComentarios(comentarios);
        evaluacion = evaluacionRepository.save(evaluacion);

        if (estado == EstadoEvaluacion.APROBADO) {
            emitirInsigniaSiCorresponde(intento, evaluacion);
        }

        return evaluacion;
    }

    /**
     * Reemplaza el "un certificado por cada ejercicio aprobado" original: ahora la constancia se
     * emite una sola vez por usuario+nivel, al completar UMBRAL_APROBADOS ejercicios distintos de
     * ese nivel. Ejercicios de TORNO_CNC+AVANZADO no mapean a ningun nivel todavia (calcularNivel
     * devuelve null) y por lo tanto nunca generan insignia -- es una limitacion conocida, no un bug.
     */
    private void emitirInsigniaSiCorresponde(Intento intento, Evaluacion evaluacion) {
        NivelInsignia nivel = calcularNivel(intento.getEjercicio());
        if (nivel == null) {
            return;
        }
        Long usuarioId = intento.getUsuario().getId();
        if (certificacionRepository.findByUsuarioIdAndNivel(usuarioId, nivel).isPresent()) {
            return; // ya tiene esta insignia, un ejercicio de mas del mismo nivel no genera otra
        }

        long aprobadosDistintos = evaluacionRepository.findByIntentoUsuarioIdAndEstado(usuarioId, EstadoEvaluacion.APROBADO)
                .stream()
                .map(ev -> ev.getIntento().getEjercicio())
                .filter(ej -> calcularNivel(ej) == nivel)
                .map(Ejercicio::getId)
                .collect(Collectors.toSet())
                .size();

        if (aprobadosDistintos < UMBRAL_APROBADOS) {
            return; // todavia no llega al umbral de esta insignia
        }

        Certificacion certificacion = new Certificacion();
        certificacion.setUsuario(intento.getUsuario());
        certificacion.setEvaluacion(evaluacion);
        certificacion.setNivel(nivel);
        certificacion.setFechaEmision(LocalDate.now());
        certificacion.setFechaVencimiento(LocalDate.now().plusMonths(MESES_VIGENCIA_CERTIFICACION));
        certificacion.setEstado(EstadoCertificacion.VIGENTE);
        certificacionRepository.save(certificacion);
    }

    /**
     * Clasificacion automatica por maquina+dificultad (ver NivelInsignia). FRESADO agrupa toda
     * FRESADORA_CNC sin distinguir dificultad; TORNO_CNC si se divide en Basico/Intermedio.
     */
    private NivelInsignia calcularNivel(Ejercicio ejercicio) {
        if (ejercicio.getMaquina() == TipoMaquina.FRESADORA_CNC) {
            return NivelInsignia.FRESADO;
        }
        if (ejercicio.getDificultad() == Dificultad.BASICO) {
            return NivelInsignia.TORNO_BASICO;
        }
        if (ejercicio.getDificultad() == Dificultad.INTERMEDIO) {
            return NivelInsignia.TORNO_INTERMEDIO;
        }
        return null;
    }

    /**
     * Progreso de insignias de un usuario (para "Mis certificados"/Dashboard del aprendiz): para
     * cada uno de los 3 niveles, cuantos ejercicios distintos aprobados tiene y si ya la completo.
     */
    public List<ProgresoInsigniaDTO> progresoInsignias(Long usuarioId) {
        List<Evaluacion> aprobadas = evaluacionRepository.findByIntentoUsuarioIdAndEstado(usuarioId, EstadoEvaluacion.APROBADO);
        return java.util.Arrays.stream(NivelInsignia.values())
                .map(nivel -> {
                    long aprobados = aprobadas.stream()
                            .map(ev -> ev.getIntento().getEjercicio())
                            .filter(ej -> calcularNivel(ej) == nivel)
                            .map(Ejercicio::getId)
                            .collect(Collectors.toSet())
                            .size();
                    Certificacion certificacion = certificacionRepository.findByUsuarioIdAndNivel(usuarioId, nivel).orElse(null);
                    return new ProgresoInsigniaDTO(
                            nivel,
                            Math.min(aprobados, UMBRAL_APROBADOS),
                            UMBRAL_APROBADOS,
                            certificacion != null,
                            certificacion != null ? certificacion.getFechaEmision() : null,
                            certificacion != null ? certificacion.getFechaVencimiento() : null,
                            certificacion != null ? certificacion.getEstado() : null
                    );
                })
                .toList();
    }

    /** Bandeja de calificacion: intentos enviados que aun no tienen Evaluacion (RF-14). */
    public List<IntentoRevisionDTO> listarPendientes() {
        return intentoRepository.findPendientesDeCalificacion().stream()
                .map(intento -> aRevisionDTO(intento, null))
                .toList();
    }

    /** Historial de intentos ya calificados, mas recientes primero (RF-14). */
    public List<IntentoRevisionDTO> listarHistorial() {
        return evaluacionRepository.findAllByOrderByFechaDesc().stream()
                .map(evaluacion -> aRevisionDTO(evaluacion.getIntento(), evaluacion))
                .toList();
    }

    private IntentoRevisionDTO aRevisionDTO(Intento intento, Evaluacion evaluacion) {
        ResultadoSimulacion resultado = resultadoSimulacionRepository.findByIntentoId(intento.getId()).orElse(null);
        return new IntentoRevisionDTO(
                intento.getId(),
                intento.getUsuario().getId(),
                intento.getUsuario().getNombre(),
                intento.getUsuario().getEmail(),
                intento.getEjercicio().getId(),
                intento.getEjercicio().getTitulo(),
                intento.getEjercicio().getMaquina(),
                intento.getCodigoIso(),
                intento.getFechaEnvio(),
                intento.getErrores(),
                resultado != null && resultado.isColisionDetectada(),
                resultado != null ? resultado.getTrayectoria2D() : null,
                intento.getResultadoAutomatico(),
                intento.getDetalleValidacionJson(),
                evaluacion != null ? evaluacion.getId() : null,
                evaluacion != null ? evaluacion.getEstado() : null,
                evaluacion != null ? evaluacion.getComentarios() : null,
                evaluacion != null ? evaluacion.getFecha() : null
        );
    }
}
