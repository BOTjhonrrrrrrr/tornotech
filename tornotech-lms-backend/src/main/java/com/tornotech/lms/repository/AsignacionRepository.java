package com.tornotech.lms.repository;

import com.tornotech.lms.model.Asignacion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AsignacionRepository extends JpaRepository<Asignacion, Long> {
    List<Asignacion> findByUsuarioId(Long usuarioId);
    List<Asignacion> findByGrupoId(Long grupoId);
    List<Asignacion> findByEjercicioId(Long ejercicioId);
}
