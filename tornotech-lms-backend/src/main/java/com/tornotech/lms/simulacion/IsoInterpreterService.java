package com.tornotech.lms.simulacion;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tornotech.lms.model.Pieza;
import com.tornotech.lms.model.TipoMaquina;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Interprete simplificado de codigo ISO (G/M) para torno y fresadora CNC (RF-07, RF-08, RF-09, RF-10).
 *
 * Soporta: G00 (rapido), G01 (lineal), G02/G03 (interpolacion circular, notacion I/J o I/K y notacion R),
 * G90/G91 (absoluto/incremental), M03/M05/M08/M09/M30.
 * G02/G03 se tesela internamente en pequenos segmentos "ARCO" para reutilizar el mismo pipeline de
 * trayectoria y de deteccion de limites/colision que G00/G01.
 * Para TORNO_CNC, ademas mantiene un perfil remanente de material (diametro restante por cada
 * muestra de Z): cada corte (G01/G02/G03) lo reduce, y un G00 que atraviesa material no removido
 * se marca como colision. El perfil final se expone en ResultadoSimulacionDTO.perfilFinal, y es
 * la base para validar "dimensiones finales dentro de tolerancia" (ver ValidacionService).
 * NO soporta todavia: compensacion de herramienta ni ciclos fijos (G7x/G8x). Fresadora no tiene
 * perfil remanente (solo el chequeo de limites por bounding box).
 */
@Service
public class IsoInterpreterService {

    private static final Pattern TOKEN = Pattern.compile("([A-Za-z])(-?\\d+\\.?\\d*)");
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final double RESOLUCION_Z_PERFIL = 0.5; // mm entre muestras del perfil remanente
    private static final double EPS_PERFIL = 0.05; // mm, tolerancia para evitar falsos positivos por redondeo

    /** Compatibilidad con llamadas que no definen pieza en bruto manual (p. ej. IntentoService). */
    public ResultadoSimulacionDTO simular(String codigoIso, Pieza pieza, TipoMaquina maquina) {
        return simular(codigoIso, pieza, maquina, null, null, null, null);
    }

    /**
     * @param stockDiametro override manual de diametro (torno, mm); si es null se usa la pieza del ejercicio.
     * @param stockLongitud override manual de longitud (torno, mm); si es null se usa la pieza del ejercicio.
     * @param stockAncho    override manual de ancho (fresadora, mm); si es null se usa la pieza del ejercicio.
     * @param stockAlto     override manual de alto (fresadora, mm); si es null se usa la pieza del ejercicio.
     */
    public ResultadoSimulacionDTO simular(String codigoIso, Pieza pieza, TipoMaquina maquina,
                                           Double stockDiametro, Double stockLongitud,
                                           Double stockAncho, Double stockAlto) {
        List<SegmentoTrayectoria> trayectoria = new ArrayList<>();
        List<ErrorPrograma> errores = new ArrayList<>();

        // {min1, max1, min2, max2}
        double[] limites = obtenerLimites(pieza, maquina, stockDiametro, stockLongitud, stockAncho, stockAlto);
        boolean colision = false;

        // Perfil remanente de material (solo torno, y solo si se conoce el stock bruto).
        double[] stockTorno = maquina == TipoMaquina.TORNO_CNC
                ? resolverStockTorno(pieza, stockDiametro, stockLongitud) : null;
        double[] perfilRemanente = null;
        if (stockTorno != null) {
            int muestras = (int) Math.ceil(stockTorno[1] / RESOLUCION_Z_PERFIL) + 1;
            perfilRemanente = new double[muestras];
            Arrays.fill(perfilRemanente, stockTorno[0]);
        }

        double x = 0, y = 0; // posicion actual (torno: eje1=X, eje2=Z mapeado a "y" para graficar en 2D)
        boolean absoluto = true;
        int gModal = 0; // 0 = G00 por defecto
        // La posicion inicial (0,0) es una posicion de referencia asumida, no un punto al que el
        // programa realmente se movio (no sabemos si la herramienta esta en una posicion segura).
        // Por eso el primer movimiento del programa no se evalua contra el perfil remanente: de lo
        // contrario, un "G00 X0 Z0" inicial (comun como referencia) se marcaria como colision falsa,
        // ya que X0 en una pieza sin desbastar es, en sentido estricto, el centro del material solido.
        boolean primerMovimiento = true;

        String[] lineas = codigoIso.split("\\r?\\n");
        for (int i = 0; i < lineas.length; i++) {
            String linea = lineas[i].trim();
            int numeroLinea = i + 1;
            if (linea.isEmpty() || linea.startsWith("(") || linea.startsWith(";")) {
                continue; // comentario o linea vacia
            }

            Matcher m = TOKEN.matcher(linea);
            Double nx = null, ny = null;
            Double ni = null, nj = null, nk = null, nr = null; // parametros de arco: I/J (fresadora) o I/K (torno), o R
            boolean tieneG = false, tieneM = false;
            int gCodigo = -1, mCodigo = -1;
            boolean tokenReconocido = false;
            boolean saltarLinea = false;

            while (m.find()) {
                tokenReconocido = true;
                char letra = Character.toUpperCase(m.group(1).charAt(0));
                double valor;
                try {
                    valor = Double.parseDouble(m.group(2));
                } catch (NumberFormatException ex) {
                    errores.add(new ErrorPrograma(numeroLinea, "SINTAXIS", "Valor numerico invalido: " + m.group(0)));
                    saltarLinea = true;
                    continue;
                }

                switch (letra) {
                    case 'N' -> { /* numero de bloque, se ignora */ }
                    case 'G' -> { tieneG = true; gCodigo = (int) valor; }
                    case 'M' -> { tieneM = true; mCodigo = (int) valor; }
                    case 'X' -> nx = valor;
                    case 'Y' -> ny = valor; // fresadora
                    case 'Z' -> ny = valor; // torno: Z se mapea al 2do eje para graficar en 2D
                    case 'I' -> ni = valor; // offset del centro del arco en el 1er eje (X)
                    case 'J' -> nj = valor; // offset del centro del arco en el 2do eje (fresadora, plano XY)
                    case 'K' -> nk = valor; // offset del centro del arco en el 2do eje (torno, plano XZ)
                    case 'R' -> nr = valor; // radio del arco (metodo alternativo a I/J/K)
                    case 'F', 'S', 'T' -> { /* avance, rpm, herramienta: no afectan la geometria todavia */ }
                    default -> errores.add(new ErrorPrograma(numeroLinea, "CODIGO_NO_SOPORTADO",
                            "Direccion no reconocida: " + letra));
                }
            }

            if (!tokenReconocido) {
                errores.add(new ErrorPrograma(numeroLinea, "SINTAXIS", "Linea no interpretable: " + linea));
                continue;
            }
            if (saltarLinea) continue;

            if (tieneG) {
                if (gCodigo == 90) { absoluto = true; continue; }
                if (gCodigo == 91) { absoluto = false; continue; }
                if (gCodigo == 0 || gCodigo == 1 || gCodigo == 2 || gCodigo == 3) {
                    gModal = gCodigo;
                } else {
                    errores.add(new ErrorPrograma(numeroLinea, "CODIGO_NO_SOPORTADO", "Codigo G" + gCodigo + " no soportado"));
                    continue;
                }
            }

            if (tieneM) {
                if (mCodigo != 3 && mCodigo != 5 && mCodigo != 8 && mCodigo != 9 && mCodigo != 30) {
                    errores.add(new ErrorPrograma(numeroLinea, "CODIGO_NO_SOPORTADO", "Codigo M" + mCodigo + " no soportado"));
                }
                continue; // los M-code de este set no mueven la herramienta
            }

            if (nx == null && ny == null) {
                continue; // linea solo con G-modal, sin desplazamiento
            }

            double xDestino = nx != null ? (absoluto ? nx : x + nx) : x;
            double yDestino = ny != null ? (absoluto ? ny : y + ny) : y;

            if (gModal == 0 || gModal == 1) {
                if (fueraDeLimites(xDestino, yDestino, limites)) {
                    colision = true;
                    errores.add(new ErrorPrograma(numeroLinea, "COLISION",
                            "La trayectoria excede los limites de la pieza (posible colision)"));
                }
                boolean esCorte = gModal == 1;
                // El primer movimiento del programa se aplica al perfil (si es un corte) pero nunca
                // se evalua como colision (ver comentario en la declaracion de primerMovimiento).
                boolean chequearColision = !primerMovimiento && !esCorte;
                if (chequearColision && actualizarPerfilRemanente(perfilRemanente, y, x, yDestino, xDestino, false)) {
                    colision = true;
                    errores.add(new ErrorPrograma(numeroLinea, "COLISION",
                            "Movimiento rapido (G00) atraviesa material que aun no ha sido removido (posible colision)"));
                } else if (esCorte) {
                    actualizarPerfilRemanente(perfilRemanente, y, x, yDestino, xDestino, true);
                }
                primerMovimiento = false;
                String tipoMovimiento = gModal == 0 ? "RAPIDO" : "LINEAL";
                trayectoria.add(new SegmentoTrayectoria(x, y, xDestino, yDestino, tipoMovimiento, numeroLinea));
                x = xDestino;
                y = yDestino;
            } else { // gModal == 2 (G02, horario) o 3 (G03, antihorario)
                boolean horario = gModal == 2;
                ArcoInfo arco = calcularArco(x, y, xDestino, yDestino, ni, nj, nk, nr, horario, numeroLinea, errores);
                if (arco == null) {
                    // Arco geometricamente invalido: ya se registro el error, no se genera trayectoria
                    // para esta linea y la posicion actual no avanza (igual que un codigo no soportado).
                    continue;
                }
                List<SegmentoTrayectoria> puntosArco = tessellarArco(x, y, xDestino, yDestino, arco, numeroLinea);
                boolean colisionEnArco = false;
                for (SegmentoTrayectoria seg : puntosArco) {
                    if (!colisionEnArco && fueraDeLimites(seg.xFin(), seg.yFin(), limites)) {
                        colision = true;
                        colisionEnArco = true;
                        errores.add(new ErrorPrograma(numeroLinea, "COLISION",
                                "La trayectoria excede los limites de la pieza (posible colision)"));
                    }
                    // G02/G03 siempre son movimientos de corte (nunca rapidos), asi que solo actualizan
                    // el perfil; no pueden generar colision por "atravesar material" en este modelo.
                    actualizarPerfilRemanente(perfilRemanente, seg.yInicio(), seg.xInicio(), seg.yFin(), seg.xFin(), true);
                }
                primerMovimiento = false;
                trayectoria.addAll(puntosArco);
                x = xDestino;
                y = yDestino;
            }
        }

        List<PuntoPerfil> perfilFinal = null;
        if (perfilRemanente != null) {
            perfilFinal = new ArrayList<>(perfilRemanente.length);
            for (int idx = 0; idx < perfilRemanente.length; idx++) {
                perfilFinal.add(new PuntoPerfil(-idx * RESOLUCION_Z_PERFIL, perfilRemanente[idx]));
            }
        }

        return new ResultadoSimulacionDTO(trayectoria, errores, colision, perfilFinal);
    }

    /**
     * Resuelve limites aproximados {min1, max1, min2, max2}. Prioridad: override manual de stock
     * (enviado desde el simulador) > parametrosGeneracion (JSON) de la pieza del ejercicio > sin limite.
     *
     * Torno: X se interpreta en modo diametro (igual que el programa lo escribe, p. ej. "X40" = Ø40),
     * consistente con el resto del interprete (que nunca divide X entre 2), asi que el limite en X es
     * 0..diametro directamente, sin convertir a radio. Z sigue la convencion ISO estandar con el
     * mandril en Z=0 y la pieza extendiendose hacia Z negativo (-longitud..0), permitiendo un pequeno
     * margen positivo para movimientos de aproximacion (p. ej. "G00 X.. Z2" antes de tocar la pieza).
     * Fresadora: bloque referenciado en el origen (0..ancho, 0..alto), sin este ajuste.
     */
    private double[] obtenerLimites(Pieza pieza, TipoMaquina maquina,
                                     Double stockDiametro, Double stockLongitud,
                                     Double stockAncho, Double stockAlto) {
        double margen = 5.0; // margen de seguridad en mm antes de reportar colision

        if (maquina == TipoMaquina.TORNO_CNC) {
            double[] stock = resolverStockTorno(pieza, stockDiametro, stockLongitud);
            if (stock != null) {
                return new double[]{-margen, stock[0] + margen, -stock[1] - margen, margen};
            }
        }
        if (maquina == TipoMaquina.FRESADORA_CNC && stockAncho != null && stockAlto != null
                && stockAncho > 0 && stockAlto > 0) {
            return new double[]{-margen, stockAncho + margen, -margen, stockAlto + margen};
        }

        try {
            if (pieza != null && pieza.getParametrosGeneracion() != null && maquina == TipoMaquina.FRESADORA_CNC) {
                JsonNode json = MAPPER.readTree(pieza.getParametrosGeneracion());
                if (json.has("ancho") && json.has("alto")) {
                    double ancho = json.get("ancho").asDouble();
                    double alto = json.get("alto").asDouble();
                    return new double[]{-margen, ancho + margen, -margen, alto + margen};
                }
            }
        } catch (Exception ignored) {
            // JSON ausente o no parseable: se omite el chequeo de colision por limites de pieza
        }
        return new double[]{-1000, 1000, -1000, 1000}; // sin datos de pieza: no bloquear la simulacion
    }

    /**
     * Resuelve {diametro, longitud} del stock de torno. Prioridad: override manual (simulador) >
     * parametrosGeneracion (JSON) de la pieza del ejercicio. Devuelve null si no hay datos suficientes.
     */
    private double[] resolverStockTorno(Pieza pieza, Double stockDiametro, Double stockLongitud) {
        if (stockDiametro != null && stockLongitud != null && stockDiametro > 0 && stockLongitud > 0) {
            return new double[]{stockDiametro, stockLongitud};
        }
        try {
            if (pieza != null && pieza.getParametrosGeneracion() != null) {
                JsonNode json = MAPPER.readTree(pieza.getParametrosGeneracion());
                if (json.has("diametro") && json.has("longitud")) {
                    return new double[]{json.get("diametro").asDouble(), json.get("longitud").asDouble()};
                }
            }
        } catch (Exception ignored) {
            // JSON ausente o no parseable: sin datos de stock, se omite el perfil remanente
        }
        return null;
    }

    private boolean fueraDeLimites(double x, double y, double[] limites) {
        return x < limites[0] || x > limites[1] || y < limites[2] || y > limites[3];
    }

    /**
     * Actualiza el perfil remanente de material a lo largo del rango de Z que atraviesa un movimiento.
     * Si es un movimiento de corte (G01/G02/G03) y el destino queda por debajo del perfil actual, lo
     * reduce (material removido valido). Si es un movimiento rapido (G00) y el destino queda por debajo
     * del perfil actual, se interpreta como colision (atraviesa material que no deberia estar ahi).
     *
     * @return true si se detecto una colision (solo posible cuando esCorte es false).
     */
    private boolean actualizarPerfilRemanente(double[] perfil, double zIni, double xIni, double zFin, double xFin,
                                               boolean esCorte) {
        if (perfil == null) return false;

        int idxIni = indiceZPerfil(zIni, perfil.length);
        int idxFin = indiceZPerfil(zFin, perfil.length);
        int paso = idxFin >= idxIni ? 1 : -1;
        int total = Math.abs(idxFin - idxIni);
        boolean colisionEncontrada = false;

        for (int i = 0; i <= total; i++) {
            int idx = idxIni + paso * i;
            if (idx < 0 || idx >= perfil.length) continue;
            double t = total == 0 ? 0 : (double) i / total;
            double xInterpolado = xIni + (xFin - xIni) * t;
            if (xInterpolado < perfil[idx] - EPS_PERFIL) {
                if (esCorte) {
                    perfil[idx] = xInterpolado;
                } else {
                    colisionEncontrada = true;
                }
            }
        }
        return colisionEncontrada;
    }

    private int indiceZPerfil(double z, int longitudArreglo) {
        int idx = (int) Math.round(-z / RESOLUCION_Z_PERFIL);
        return Math.max(0, Math.min(longitudArreglo - 1, idx));
    }

    /** Geometria resuelta de un arco: centro, radio, angulo inicial y barrido total (con signo). */
    private record ArcoInfo(double centroX, double centroY, double radio, double anguloInicio, double barrido) {
    }

    /**
     * Calcula el centro y radio de un arco G02/G03 a partir de I/J (fresadora), I/K (torno) o R.
     * Devuelve null y agrega el error correspondiente a la lista si la geometria es invalida.
     */
    private ArcoInfo calcularArco(double xIni, double yIni, double xDestino, double yDestino,
                                   Double i, Double j, Double k, Double r, boolean horario,
                                   int numeroLinea, List<ErrorPrograma> errores) {
        Double offsetSegundoEje = k != null ? k : j; // K (torno) tiene prioridad si por error vinieran ambos
        double centroX, centroY, radio;

        if (i != null || offsetSegundoEje != null) {
            double di = i != null ? i : 0;
            double dj = offsetSegundoEje != null ? offsetSegundoEje : 0;
            centroX = xIni + di;
            centroY = yIni + dj;
            double radioInicio = Math.hypot(xIni - centroX, yIni - centroY);
            double radioFin = Math.hypot(xDestino - centroX, yDestino - centroY);
            if (radioInicio < 1e-9) {
                errores.add(new ErrorPrograma(numeroLinea, "ARCO_INVALIDO",
                        "El punto inicial del arco coincide con el centro definido por I/J/K"));
                return null;
            }
            double tolerancia = Math.min(0.5, Math.max(0.01, radioInicio * 0.01));
            if (Math.abs(radioInicio - radioFin) > tolerancia) {
                errores.add(new ErrorPrograma(numeroLinea, "ARCO_INVALIDO", String.format(
                        "Radio inicial (%.3f mm) distinto al radio final (%.3f mm); revisa I/J/K, X y Z",
                        radioInicio, radioFin)));
                return null;
            }
            radio = radioInicio;
        } else if (r != null) {
            double[] centro = centroDesdeRadio(xIni, yIni, xDestino, yDestino, r, horario, numeroLinea, errores);
            if (centro == null) return null; // el error ya fue registrado dentro de centroDesdeRadio
            centroX = centro[0];
            centroY = centro[1];
            radio = Math.abs(r);
        } else {
            errores.add(new ErrorPrograma(numeroLinea, "ARCO_INVALIDO",
                    "Arco G02/G03 sin centro (I/J o I/K) ni radio (R) definido"));
            return null;
        }

        boolean mismoPunto = Math.hypot(xDestino - xIni, yDestino - yIni) < 1e-8;
        boolean circuloCompleto = mismoPunto && (i != null || offsetSegundoEje != null);
        double anguloInicio = Math.atan2(yIni - centroY, xIni - centroX);
        double barrido;
        if (circuloCompleto) {
            barrido = horario ? -2 * Math.PI : 2 * Math.PI;
        } else {
            double anguloFin = Math.atan2(yDestino - centroY, xDestino - centroX);
            barrido = calcularBarrido(anguloInicio, anguloFin, horario);
        }

        return new ArcoInfo(centroX, centroY, radio, anguloInicio, barrido);
    }

    /**
     * Metodo R: el centro puede estar a un lado u otro de la cuerda inicio-fin.
     * Convencion ISO: R positivo => arco menor o igual a 180 grados, R negativo => arco mayor a 180 grados.
     * Devuelve null (y registra el error) si el radio es geometricamente imposible para esa cuerda.
     */
    private double[] centroDesdeRadio(double xIni, double yIni, double xDestino, double yDestino,
                                       double r, boolean horario, int numeroLinea, List<ErrorPrograma> errores) {
        double dx = xDestino - xIni;
        double dy = yDestino - yIni;
        double cuerda = Math.hypot(dx, dy);
        double radioAbs = Math.abs(r);

        if (cuerda < 1e-9) {
            errores.add(new ErrorPrograma(numeroLinea, "ARCO_INVALIDO",
                    "No se puede definir un circulo completo con R: se requiere un punto final distinto al inicial"));
            return null;
        }
        if (radioAbs < cuerda / 2 - 1e-6) {
            errores.add(new ErrorPrograma(numeroLinea, "ARCO_INVALIDO", String.format(
                    "R%.3f es menor que la mitad de la distancia entre el punto inicial y el final (%.3f mm)",
                    r, cuerda / 2)));
            return null;
        }

        double medioX = (xIni + xDestino) / 2;
        double medioY = (yIni + yDestino) / 2;
        double h = Math.sqrt(Math.max(0, radioAbs * radioAbs - (cuerda * cuerda) / 4));
        double perpX = -dy / cuerda;
        double perpY = dx / cuerda;

        double[][] candidatos = {
                {medioX + perpX * h, medioY + perpY * h},
                {medioX - perpX * h, medioY - perpY * h}
        };

        boolean quiereArcoMayor = r < 0;
        double[] elegido = null;
        double mejorDiferencia = Double.MAX_VALUE;
        for (double[] centro : candidatos) {
            double a0 = Math.atan2(yIni - centro[1], xIni - centro[0]);
            double a1 = Math.atan2(yDestino - centro[1], xDestino - centro[0]);
            double magnitud = Math.abs(calcularBarrido(a0, a1, horario));
            boolean esArcoMayor = magnitud >= Math.PI - 1e-7;
            if (esArcoMayor == quiereArcoMayor) {
                elegido = centro;
                break;
            }
            double objetivo = quiereArcoMayor ? 2 * Math.PI : 0;
            double diferencia = Math.abs(magnitud - objetivo);
            if (diferencia < mejorDiferencia) {
                mejorDiferencia = diferencia;
                elegido = centro;
            }
        }
        return elegido;
    }

    /** Barrido angular con signo entre dos angulos, respetando el sentido horario/antihorario. */
    private double calcularBarrido(double anguloInicio, double anguloFin, boolean horario) {
        double diferencia = horario
                ? normalizarAngulo(anguloInicio - anguloFin)
                : normalizarAngulo(anguloFin - anguloInicio);
        return horario ? -diferencia : diferencia;
    }

    private double normalizarAngulo(double angulo) {
        double dosPi = 2 * Math.PI;
        double resultado = angulo % dosPi;
        return resultado < 0 ? resultado + dosPi : resultado;
    }

    /**
     * Convierte un arco en una serie de pequenos segmentos "ARCO" para reutilizar el mismo pipeline
     * de render y de deteccion de colision que las lineas rectas. El ultimo punto se fuerza a coincidir
     * exactamente con el destino programado, para evitar errores visuales de redondeo.
     */
    private List<SegmentoTrayectoria> tessellarArco(double xIni, double yIni, double xDestino, double yDestino,
                                                      ArcoInfo arco, int numeroLinea) {
        List<SegmentoTrayectoria> segmentos = new ArrayList<>();
        int pasos = Math.max(12, (int) Math.ceil(Math.abs(arco.barrido()) * 24)); // ~24 sub-segmentos por radian
        double xAnterior = xIni, yAnterior = yIni;
        for (int p = 1; p <= pasos; p++) {
            double xPunto, yPunto;
            if (p == pasos) {
                xPunto = xDestino;
                yPunto = yDestino;
            } else {
                double t = (double) p / pasos;
                double angulo = arco.anguloInicio() + arco.barrido() * t;
                xPunto = arco.centroX() + arco.radio() * Math.cos(angulo);
                yPunto = arco.centroY() + arco.radio() * Math.sin(angulo);
            }
            segmentos.add(new SegmentoTrayectoria(xAnterior, yAnterior, xPunto, yPunto, "ARCO", numeroLinea));
            xAnterior = xPunto;
            yAnterior = yPunto;
        }
        return segmentos;
    }
}
