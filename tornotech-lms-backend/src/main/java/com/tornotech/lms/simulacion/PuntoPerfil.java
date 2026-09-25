package com.tornotech.lms.simulacion;

/**
 * Un punto del perfil remanente de material (solo torno): a la coordenada Z, el diametro que
 * queda de material tras simular todo el programa (RF-09, validacion automatica de dimensiones).
 */
public record PuntoPerfil(double z, double diametro) {
}
