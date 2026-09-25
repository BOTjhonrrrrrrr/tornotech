package com.tornotech.lms.repository;

import com.tornotech.lms.model.Intento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface IntentoRepository extends JpaRepository<Intento, Long> {
    List<Intento> findByUsuarioId(Long usuarioId);
    List<Intento> findByEjercicioId(Long ejercicioId);

    /** Intentos que todavia no tienen una Evaluacion asociada (RF-14: bandeja de calificacion). */
    @Query("SELECT i FROM Intento i WHERE NOT EXISTS (SELECT 1 FROM Evaluacion e WHERE e.intento = i) "
            + "ORDER BY i.fechaEnvio DESC")
    List<Intento> findPendientesDeCalificacion();
}
