package com.tornotech.lms.repository;

import com.tornotech.lms.model.ResultadoSimulacion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ResultadoSimulacionRepository extends JpaRepository<ResultadoSimulacion, Long> {
    Optional<ResultadoSimulacion> findByIntentoId(Long intentoId);
}
