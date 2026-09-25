package com.tornotech.lms.repository;

import com.tornotech.lms.model.Ejercicio;
import com.tornotech.lms.model.TipoMaquina;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EjercicioRepository extends JpaRepository<Ejercicio, Long> {
    List<Ejercicio> findByMaquina(TipoMaquina maquina);
    List<Ejercicio> findByInstructorId(Long instructorId);
}
