package com.tornotech.lms.util;

import java.util.regex.Pattern;

/**
 * Estandar de contraseñas de TornoTech LMS (RF-01/RF-02): minimo 10 caracteres, con al menos una
 * mayuscula, una minuscula, un numero y un simbolo. Se aplica tanto al auto-registro publico
 * (AuthController) como a la creacion de usuarios por un administrador (UsuarioController), para
 * que el estandar sea el mismo sin importar quien cree la cuenta.
 */
public final class PasswordValidator {

    private static final int LONGITUD_MINIMA = 10;
    private static final Pattern MAYUSCULA = Pattern.compile("[A-Z]");
    private static final Pattern MINUSCULA = Pattern.compile("[a-z]");
    private static final Pattern NUMERO = Pattern.compile("[0-9]");
    private static final Pattern SIMBOLO = Pattern.compile("[^A-Za-z0-9]");

    private PasswordValidator() {
    }

    /** Lanza RuntimeException con un mensaje especifico (RF-08 style) si la contraseña no cumple el estandar. */
    public static void validar(String password) {
        if (password == null || password.length() < LONGITUD_MINIMA) {
            throw new RuntimeException("La contraseña debe tener al menos " + LONGITUD_MINIMA + " caracteres");
        }
        if (!MAYUSCULA.matcher(password).find()) {
            throw new RuntimeException("La contraseña debe incluir al menos una letra mayúscula");
        }
        if (!MINUSCULA.matcher(password).find()) {
            throw new RuntimeException("La contraseña debe incluir al menos una letra minúscula");
        }
        if (!NUMERO.matcher(password).find()) {
            throw new RuntimeException("La contraseña debe incluir al menos un número");
        }
        if (!SIMBOLO.matcher(password).find()) {
            throw new RuntimeException("La contraseña debe incluir al menos un símbolo (por ejemplo: ! @ # $ %)");
        }
    }
}
