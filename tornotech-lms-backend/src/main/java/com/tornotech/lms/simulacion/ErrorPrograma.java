package com.tornotech.lms.simulacion;

/** Error de sintaxis o de trayectoria detectado al procesar codigo ISO (RF-08, RF-09). */
public record ErrorPrograma(
        int linea,
        String tipo,      // "SINTAXIS" | "COLISION" | "CODIGO_NO_SOPORTADO" | "ARCO_INVALIDO"
        String mensaje
) {
}
