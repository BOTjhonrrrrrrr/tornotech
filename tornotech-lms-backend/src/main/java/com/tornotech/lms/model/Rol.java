package com.tornotech.lms.model;

/**
 * Roles del sistema TornoTech LMS.
 * Ver seccion 3 del documento de requisitos.
 * APRENDIZ se llamaba EMPLEADO originalmente -- renombrado para que coincida con el vocabulario
 * real del curso. Si la base de datos ya tiene filas con rol = 'EMPLEADO', hace falta correr:
 *   UPDATE usuario SET rol = 'APRENDIZ' WHERE rol = 'EMPLEADO';
 */
public enum Rol {
    ADMINISTRADOR,
    INSTRUCTOR,
    APRENDIZ,
    OBSERVADOR
}
