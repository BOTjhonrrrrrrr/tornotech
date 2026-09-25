package com.tornotech.lms.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tornotech.lms.model.Ejercicio;
import com.tornotech.lms.model.EstrategiaEsperada;
import com.tornotech.lms.model.ResultadoAutomatico;
import com.tornotech.lms.simulacion.PuntoPerfil;
import com.tornotech.lms.simulacion.ResultadoSimulacionDTO;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Motor de aprobacion automatica de intentos, con los 3 criterios confirmados por el usuario:
 * 1) Sin colisiones ni errores de sintaxis.
 * 2) Dimensiones finales dentro de tolerancia (solo si el ejercicio define diametroObjetivo/longitudCorte).
 * 3) Uso correcto de codigos/estrategia esperada (solo si el ejercicio define codigosRequeridos/
 *    codigosProhibidos/estrategiaEsperada).
 *
 * Solo produce APROBADO cuando el ejercicio SI tiene al menos un criterio de dimension o de
 * codigo/estrategia configurado y todos se cumplen; si el ejercicio no define ninguno, el veredicto
 * es siempre PENDIENTE_REVISION (no hay suficiente informacion para aprobar automaticamente, se
 * mantiene el flujo manual de siempre). RECHAZADO y PENDIENTE_REVISION son solo una sugerencia:
 * el intento sigue visible en la bandeja de calificacion del instructor (ver EvaluacionController).
 */
@Service
public class ValidacionService {

    private static final Pattern CODIGO_G = Pattern.compile("G0*([0-9]+)", Pattern.CASE_INSENSITIVE);
    private static final double TOLERANCIA_POR_DEFECTO = 0.2;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /** Resultado detallado por criterio, persistido como JSON en Intento.detalleValidacionJson. */
    public record DetalleValidacion(
            boolean sinColisionNiErrores,
            Double desviacionMaximaMm,
            Boolean dentroDeTolerancia,
            Boolean codigosOk,
            Boolean estrategiaOk,
            List<String> mensajes
    ) {
    }

    public record Resultado(ResultadoAutomatico veredicto, String detalleJson) {
    }

    public Resultado evaluar(Ejercicio ejercicio, String codigoIso, ResultadoSimulacionDTO resultadoSimulacion) {
        List<String> mensajes = new ArrayList<>();

        // Criterio 1: sin colisiones ni errores de sintaxis. Si falla, se corta aqui (RECHAZADO).
        boolean sinColisionNiErrores = !resultadoSimulacion.colisionDetectada() && resultadoSimulacion.errores().isEmpty();
        if (!sinColisionNiErrores) {
            mensajes.add(resultadoSimulacion.colisionDetectada()
                    ? "Se detecto una posible colision durante la simulacion."
                    : "El programa tiene errores de sintaxis o codigos no soportados.");
            return new Resultado(ResultadoAutomatico.RECHAZADO,
                    aJson(new DetalleValidacion(false, null, null, null, null, mensajes)));
        }

        boolean tieneCriteriosDimension = ejercicio.getDiametroObjetivo() != null && ejercicio.getLongitudCorte() != null;
        boolean tieneCriteriosCodigo = tieneTexto(ejercicio.getCodigosRequeridos())
                || tieneTexto(ejercicio.getCodigosProhibidos())
                || (ejercicio.getEstrategiaEsperada() != null && ejercicio.getEstrategiaEsperada() != EstrategiaEsperada.LIBRE);

        if (!tieneCriteriosDimension && !tieneCriteriosCodigo) {
            mensajes.add("Este ejercicio no tiene criterios de aprobacion automatica configurados.");
            return new Resultado(ResultadoAutomatico.PENDIENTE_REVISION,
                    aJson(new DetalleValidacion(true, null, null, null, null, mensajes)));
        }

        // Criterio 2: dimension final dentro de tolerancia, sobre el tramo [0, -longitudCorte].
        Double desviacionMaxima = null;
        Boolean dentroDeTolerancia = null;
        if (tieneCriteriosDimension) {
            if (resultadoSimulacion.perfilFinal() == null || resultadoSimulacion.perfilFinal().isEmpty()) {
                dentroDeTolerancia = false;
                mensajes.add("No se pudo calcular el perfil final de la pieza (falta stock definido).");
            } else {
                double tolerancia = ejercicio.getToleranciaMm() != null ? ejercicio.getToleranciaMm() : TOLERANCIA_POR_DEFECTO;
                double maxDesviacion = 0;
                int muestras = 0;
                for (PuntoPerfil punto : resultadoSimulacion.perfilFinal()) {
                    if (punto.z() < -ejercicio.getLongitudCorte()) continue; // fuera del tramo objetivo
                    maxDesviacion = Math.max(maxDesviacion, Math.abs(punto.diametro() - ejercicio.getDiametroObjetivo()));
                    muestras++;
                }
                if (muestras == 0) {
                    dentroDeTolerancia = false;
                    mensajes.add("La longitud de corte esperada no se pudo verificar (fuera del rango simulado).");
                } else {
                    desviacionMaxima = maxDesviacion;
                    dentroDeTolerancia = maxDesviacion <= tolerancia;
                    if (!dentroDeTolerancia) {
                        mensajes.add(String.format(
                                "Diametro final fuera de tolerancia: desviacion maxima %.3f mm (tolerancia %.3f mm).",
                                maxDesviacion, tolerancia));
                    }
                }
            }
        }

        // Criterio 3: codigos requeridos/prohibidos y estrategia esperada.
        Boolean codigosOk = null;
        Boolean estrategiaOk = null;
        if (tieneCriteriosCodigo) {
            List<String> codigosUsados = extraerCodigosG(codigoIso);

            codigosOk = true;
            for (String requerido : dividirCodigos(ejercicio.getCodigosRequeridos())) {
                if (!codigosUsados.contains(requerido)) {
                    codigosOk = false;
                    mensajes.add("Falta el codigo requerido " + requerido + " en el programa.");
                }
            }
            for (String prohibido : dividirCodigos(ejercicio.getCodigosProhibidos())) {
                if (codigosUsados.contains(prohibido)) {
                    codigosOk = false;
                    mensajes.add("Se uso el codigo prohibido " + prohibido + " en el programa.");
                }
            }

            estrategiaOk = true;
            boolean usaInterpolacion = codigosUsados.contains("G02") || codigosUsados.contains("G03");
            if (ejercicio.getEstrategiaEsperada() == EstrategiaEsperada.INTERPOLACION_CIRCULAR && !usaInterpolacion) {
                estrategiaOk = false;
                mensajes.add("Se esperaba interpolacion circular (G02/G03) y el programa solo usa movimientos lineales.");
            }
            if (ejercicio.getEstrategiaEsperada() == EstrategiaEsperada.PUNTO_A_PUNTO && usaInterpolacion) {
                estrategiaOk = false;
                mensajes.add("Se esperaba solo movimientos lineales (G01) y el programa usa interpolacion circular.");
            }
        }

        boolean aprobado = (!tieneCriteriosDimension || Boolean.TRUE.equals(dentroDeTolerancia))
                && (!tieneCriteriosCodigo || (Boolean.TRUE.equals(codigosOk) && Boolean.TRUE.equals(estrategiaOk)));

        DetalleValidacion detalle = new DetalleValidacion(true, desviacionMaxima, dentroDeTolerancia, codigosOk, estrategiaOk, mensajes);

        if (aprobado) {
            mensajes.add(0, "Cumple los criterios de aprobacion automatica.");
            return new Resultado(ResultadoAutomatico.APROBADO, aJson(detalle));
        }
        return new Resultado(ResultadoAutomatico.PENDIENTE_REVISION, aJson(detalle));
    }

    private List<String> extraerCodigosG(String codigoIso) {
        List<String> encontrados = new ArrayList<>();
        Matcher m = CODIGO_G.matcher(codigoIso == null ? "" : codigoIso);
        while (m.find()) {
            encontrados.add(String.format("G%02d", Integer.parseInt(m.group(1))));
        }
        return encontrados;
    }

    private List<String> dividirCodigos(String csv) {
        if (!tieneTexto(csv)) return List.of();
        return Arrays.stream(csv.split(","))
                .map(this::normalizarCodigoG)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    private String normalizarCodigoG(String texto) {
        if (texto == null) return "";
        Matcher m = CODIGO_G.matcher(texto.trim());
        if (m.find()) {
            return String.format("G%02d", Integer.parseInt(m.group(1)));
        }
        return texto.trim().toUpperCase();
    }

    private boolean tieneTexto(String s) {
        return s != null && !s.isBlank();
    }

    private String aJson(Object valor) {
        try {
            return objectMapper.writeValueAsString(valor);
        } catch (Exception e) {
            return "{}";
        }
    }
}
