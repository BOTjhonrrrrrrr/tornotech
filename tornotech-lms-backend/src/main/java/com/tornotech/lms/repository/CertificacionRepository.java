package com.tornotech.lms.repository;

import com.tornotech.lms.model.Certificacion;
import com.tornotech.lms.model.NivelInsignia;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CertificacionRepository extends JpaRepository<Certificacion, Long> {
    List<Certificacion> findByUsuarioId(Long usuarioId);

    // Una insignia por usuario+nivel como maximo (ver EvaluacionService antes de emitir una nueva).
    Optional<Certificacion> findByUsuarioIdAndNivel(Long usuarioId, NivelInsignia nivel);
}
