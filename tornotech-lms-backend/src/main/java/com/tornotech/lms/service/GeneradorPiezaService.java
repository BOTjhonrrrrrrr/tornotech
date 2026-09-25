package com.tornotech.lms.service;

import com.tornotech.lms.model.Pieza;
import com.tornotech.lms.model.TipoMaquina;
import org.springframework.stereotype.Service;

import java.util.Random;

/**
 * Generador aleatorio de piezas de practica (RF-05).
 * Implementacion inicial: geometrias parametricas simples. Ampliar con mas formas
 * y con parametros configurables por el instructor segun se defina el catalogo de piezas.
 */
@Service
public class GeneradorPiezaService {

    private final Random random = new Random();

    public Pieza generar(TipoMaquina maquina) {
        Pieza pieza = new Pieza();
        pieza.setMaquina(maquina);
        pieza.setGeneradaAutomaticamente(true);

        if (maquina == TipoMaquina.TORNO_CNC) {
            int diametro = 20 + random.nextInt(60);   // 20-80 mm
            int longitud = 50 + random.nextInt(150);  // 50-200 mm
            pieza.setGeometriaBase("cilindro_escalonado");
            pieza.setDimensiones("diametro=%dmm; longitud=%dmm".formatted(diametro, longitud));
            pieza.setParametrosGeneracion(
                    "{\"tipo\":\"cilindro_escalonado\",\"diametro\":%d,\"longitud\":%d}".formatted(diametro, longitud));
        } else {
            int ancho = 40 + random.nextInt(100);
            int alto = 40 + random.nextInt(100);
            int profundidadBolsillo = 5 + random.nextInt(15);
            pieza.setGeometriaBase("bloque_con_bolsillo");
            pieza.setDimensiones("ancho=%dmm; alto=%dmm; bolsillo=%dmm".formatted(ancho, alto, profundidadBolsillo));
            pieza.setParametrosGeneracion(
                    "{\"tipo\":\"bloque_con_bolsillo\",\"ancho\":%d,\"alto\":%d,\"profundidadBolsillo\":%d}"
                            .formatted(ancho, alto, profundidadBolsillo));
        }

        return pieza;
    }
}
