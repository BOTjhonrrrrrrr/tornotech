package com.tornotech.lms.controller;

import com.tornotech.lms.model.Asignacion;
import com.tornotech.lms.model.Ejercicio;
import com.tornotech.lms.model.Usuario;
import com.tornotech.lms.repository.AsignacionRepository;
import com.tornotech.lms.repository.EjercicioRepository;
import com.tornotech.lms.repository.UsuarioRepository;
import com.tornotech.lms.security.UsuarioActualService;
import com.tornotech.lms.simulacion.IsoInterpreterService;
import com.tornotech.lms.simulacion.PlanoDTO;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Pantalla "Gestion de instruccion": ejercicios y piezas de practica (RF-04, RF-05).
 * La generacion aleatoria de piezas (RF-05) se resuelve en PiezaController/SimulacionService.
 */
@RestController
@RequestMapping("/api/ejercicios")
public class EjercicioController {

    private static final Set<String> ROLES_SUPERVISION = Set.of("ADMINISTRADOR", "INSTRUCTOR", "OBSERVADOR");

    private final EjercicioRepository ejercicioRepository;
    private final AsignacionRepository asignacionRepository;
    private final UsuarioRepository usuarioRepository;
    private final UsuarioActualService usuarioActualService;
    private final IsoInterpreterService isoInterpreterService;

    public EjercicioController(EjercicioRepository ejercicioRepository, AsignacionRepository asignacionRepository,
                                UsuarioRepository usuarioRepository, UsuarioActualService usuarioActualService,
                                IsoInterpreterService isoInterpreterService) {
        this.ejercicioRepository = ejercicioRepository;
        this.asignacionRepository = asignacionRepository;
        this.usuarioRepository = usuarioRepository;
        this.usuarioActualService = usuarioActualService;
        this.isoInterpreterService = isoInterpreterService;
    }

    @GetMapping
    public List<Ejercicio> listar() {
        return ejercicioRepository.findAll();
    }

    @GetMapping("/{id}")
    public Ejercicio obtener(@PathVariable Long id) {
        return ejercicioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ejercicio no encontrado"));
    }

    /**
     * Ejercicios asignados a un usuario (RF-06), directamente o via su grupo. El Simulador CNC la usa
     * para APRENDIZ/OBSERVADOR en vez de listar() (que trae todos los ejercicios sin filtrar); Admin
     * e Instructor siguen usando listar() porque necesitan ver/probar cualquier ejercicio.
     * Dedup manual por id: findByUsuarioId y findByGrupoId corren en transacciones separadas (no hay
     * @Transactional aqui), asi que no comparten identity map y un mismo Ejercicio podria repetirse
     * como instancias distintas si esta asignado tanto al usuario como a su grupo.
     */
    @GetMapping("/asignados/{usuarioId}")
    public List<Ejercicio> asignados(@PathVariable Long usuarioId) {
        usuarioActualService.verificarAccesoUsuario(usuarioId, ROLES_SUPERVISION);

        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        List<Asignacion> asignaciones = new ArrayList<>(asignacionRepository.findByUsuarioId(usuarioId));
        if (usuario.getGrupo() != null) {
            asignaciones.addAll(asignacionRepository.findByGrupoId(usuario.getGrupo().getId()));
        }

        Map<Long, Ejercicio> porId = new LinkedHashMap<>();
        for (Asignacion asignacion : asignaciones) {
            Ejercicio ejercicio = asignacion.getEjercicio();
            porId.put(ejercicio.getId(), ejercicio);
        }
        return new ArrayList<>(porId.values());
    }

    /**
     * Plano tecnico de referencia (RF-09/RF-11 extendido). Dos fuentes posibles, no excluyentes:
     * 1) una imagen subida por el instructor desde un CAD externo (Ejercicio.planoImagenBase64) --
     *    si existe, tiene prioridad porque es el dibujo "real" de manufactura;
     * 2) el codigo ISO "solucion" (Ejercicio.codigoReferencia), simulado aqui server-side contra la
     *    pieza REAL del ejercicio para generar una geometria de referencia.
     * "disponible=false" solo si el instructor no cargo ninguna de las dos -- ambas son opcionales.
     */
    @GetMapping("/{id}/plano")
    public PlanoDTO plano(@PathVariable Long id) {
        Ejercicio ejercicio = obtener(id);
        boolean tieneImagen = ejercicio.getPlanoImagenBase64() != null && !ejercicio.getPlanoImagenBase64().isBlank();
        boolean tieneCodigoReferencia = ejercicio.getCodigoReferencia() != null && !ejercicio.getCodigoReferencia().isBlank();
        if (!tieneImagen && !tieneCodigoReferencia) {
            return PlanoDTO.noDisponible();
        }
        var resultado = tieneCodigoReferencia
                ? isoInterpreterService.simular(ejercicio.getCodigoReferencia(), ejercicio.getPieza(), ejercicio.getMaquina())
                : null;
        return new PlanoDTO(true, resultado, tieneImagen ? ejercicio.getPlanoImagenBase64() : null);
    }

    @PostMapping
    public Ejercicio crear(@RequestBody Ejercicio ejercicio) {
        return ejercicioRepository.save(ejercicio);
    }

    /**
     * Antes solo actualizaba 5 de los 12 campos editables (faltaban los criterios de
     * ValidacionService y codigoReferencia) -- el formulario de edicion del frontend los ignoraba
     * en silencio. codigoReferencia es la excepcion: es WRITE_ONLY (nunca vuelve en un GET, ver
     * Ejercicio.java), asi que el frontend no puede precargarlo; si el instructor no escribe uno
     * nuevo al editar, se conserva el que ya habia en vez de borrarlo.
     */
    @PutMapping("/{id}")
    public Ejercicio actualizar(@PathVariable Long id, @RequestBody Ejercicio cambios) {
        Ejercicio ejercicio = obtener(id);
        ejercicio.setTitulo(cambios.getTitulo());
        ejercicio.setMaquina(cambios.getMaquina());
        ejercicio.setDificultad(cambios.getDificultad());
        ejercicio.setPieza(cambios.getPieza());
        ejercicio.setDescripcion(cambios.getDescripcion());
        ejercicio.setDiametroObjetivo(cambios.getDiametroObjetivo());
        ejercicio.setLongitudCorte(cambios.getLongitudCorte());
        ejercicio.setToleranciaMm(cambios.getToleranciaMm());
        ejercicio.setCodigosRequeridos(cambios.getCodigosRequeridos());
        ejercicio.setCodigosProhibidos(cambios.getCodigosProhibidos());
        ejercicio.setEstrategiaEsperada(cambios.getEstrategiaEsperada());
        if (cambios.getCodigoReferencia() != null && !cambios.getCodigoReferencia().isBlank()) {
            ejercicio.setCodigoReferencia(cambios.getCodigoReferencia());
        }
        // A diferencia de codigoReferencia, planoImagenBase64 no es WRITE_ONLY (el frontend SI la
        // recibe en el GET), asi que aca se refleja tal cual venga -- incluido null/"" para permitir
        // que el instructor quite una imagen ya subida.
        ejercicio.setPlanoImagenBase64(cambios.getPlanoImagenBase64());
        return ejercicioRepository.save(ejercicio);
    }

    @DeleteMapping("/{id}")
    public void eliminar(@PathVariable Long id) {
        ejercicioRepository.deleteById(id);
    }
}
