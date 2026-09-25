package com.tornotech.lms.simulacion;

import java.util.List;

/** perfilFinal: solo se calcula para TORNO_CNC con stock conocido; null en otro caso (ver ValidacionService). */
public record ResultadoSimulacionDTO(
        List<SegmentoTrayectoria> trayectoria,
        List<ErrorPrograma> errores,
        boolean colisionDetectada,
        List<PuntoPerfil> perfilFinal
) {
    public boolean esValido() {
        return errores.isEmpty();
    }
}
