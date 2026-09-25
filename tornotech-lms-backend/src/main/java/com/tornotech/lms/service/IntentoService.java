package com.tornotech.lms.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tornotech.lms.model.*;
import com.tornotech.lms.repository.*;
import com.tornotech.lms.simulacion.IsoInterpreterService;
import com.tornotech.lms.simulacion.ResultadoSimulacionDTO;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IntentoService {

    private final IntentoRepository intentoRepository;
    private final EjercicioRepository ejercicioRepository;
    private final UsuarioRepository usuarioRepository;
    private final ResultadoSimulacionRepository resultadoSimulacionRepository;
    private final IsoInterpreterService isoInterpreterService;
    private final ValidacionService validacionService;
    private final EvaluacionService evaluacionService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public IntentoService(IntentoRepository intentoRepository,
                           EjercicioRepository ejercicioRepository,
                           UsuarioRepository usuarioRepository,
                           ResultadoSimulacionRepository resultadoSimulacionRepository,
                           IsoInterpreterService isoInterpreterService,
                           ValidacionService validacionService,
                           EvaluacionService evaluacionService) {
        this.intentoRepository = intentoRepository;
        this.ejercicioRepository = ejercicioRepository;
        this.usuarioRepository = usuarioRepository;
        this.resultadoSimulacionRepository = resultadoSimulacionRepository;
        this.isoInterpreterService = isoInterpreterService;
        this.validacionService = validacionService;
        this.evaluacionService = evaluacionService;
    }

    /**
     * Ejecuta la simulacion, corre la validacion automatica (RF-13, ver ValidacionService) y guarda
     * el Intento + su ResultadoSimulacion. Si el veredicto es APROBADO, emite la Evaluacion y
     * Certificacion automaticamente (a nombre del instructor del ejercicio); en cualquier otro caso
     * el intento queda visible en la bandeja de calificacion manual (EvaluacionController).
     *
     * @Transactional: guarda Intento + ResultadoSimulacion (y, si aplica, Evaluacion+Certificacion
     * via EvaluacionService.calificar) como una sola unidad -- antes, sin limite transaccional, una
     * falla a mitad de este metodo podia dejar un Intento guardado sin su ResultadoSimulacion.
     */
    @Transactional
    public Intento registrarIntento(Long usuarioId, Long ejercicioId, String codigoIso) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        Ejercicio ejercicio = ejercicioRepository.findById(ejercicioId)
                .orElseThrow(() -> new RuntimeException("Ejercicio no encontrado"));

        ResultadoSimulacionDTO resultado = isoInterpreterService.simular(codigoIso, ejercicio.getPieza(), ejercicio.getMaquina());
        ValidacionService.Resultado validacion = validacionService.evaluar(ejercicio, codigoIso, resultado);

        Intento intento = new Intento();
        intento.setUsuario(usuario);
        intento.setEjercicio(ejercicio);
        intento.setCodigoIso(codigoIso);
        intento.setErrores(aJson(resultado.errores()));
        intento.setResultadoAutomatico(validacion.veredicto());
        intento.setDetalleValidacionJson(validacion.detalleJson());
        intento = intentoRepository.save(intento);

        ResultadoSimulacion resultadoEntidad = new ResultadoSimulacion();
        resultadoEntidad.setIntento(intento);
        resultadoEntidad.setTrayectoria2D(aJson(resultado.trayectoria()));
        resultadoEntidad.setColisionDetectada(resultado.colisionDetectada());
        if (resultado.perfilFinal() != null) {
            resultadoEntidad.setPerfilFinalJson(aJson(resultado.perfilFinal()));
        }
        resultadoSimulacionRepository.save(resultadoEntidad);

        if (validacion.veredicto() == ResultadoAutomatico.APROBADO) {
            evaluacionService.calificar(intento.getId(), ejercicio.getInstructor().getId(),
                    EstadoEvaluacion.APROBADO, "Aprobado automaticamente por el sistema de validacion.");
        }

        return intento;
    }

    private String aJson(Object valor) {
        try {
            return objectMapper.writeValueAsString(valor);
        } catch (Exception e) {
            return "[]";
        }
    }
}
