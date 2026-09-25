package com.tornotech.lms.repository;

import com.tornotech.lms.model.Evaluacion;
import com.tornotech.lms.model.EstadoEvaluacion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EvaluacionRepository extends JpaRepository<Evaluacion, Long> {
    List<Evaluacion> findAllByOrderByFechaDesc();

    // Para calcular progreso de insignias (ver EvaluacionService.calcularNivel): todas las
    // evaluaciones de un usuario en un estado dado, navegando evaluacion -> intento -> usuario.
    List<Evaluacion> findByIntentoUsuarioIdAndEstado(Long usuarioId, EstadoEvaluacion estado);
}
