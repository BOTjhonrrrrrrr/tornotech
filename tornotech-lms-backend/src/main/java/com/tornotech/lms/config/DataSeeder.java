package com.tornotech.lms.config;

import com.tornotech.lms.model.*;
import com.tornotech.lms.repository.*;
import com.tornotech.lms.service.GeneradorPiezaService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Crea datos de prueba SOLO si la tabla usuario esta vacia (primer arranque).
 * Resuelve el problema de "huevo y gallina": para crear usuarios via API hace falta
 * ser ADMINISTRADOR, pero no puede existir un ADMINISTRADOR sin que alguien lo cree antes.
 *
 * IMPORTANTE: estas credenciales son solo para desarrollo. Antes de cualquier entrega
 * o despliegue real, cambiar las contraseñas (o eliminar este seeder).
 */
@Component
public class DataSeeder implements CommandLineRunner {

    private final UsuarioRepository usuarioRepository;
    private final GrupoRepository grupoRepository;
    private final PiezaRepository piezaRepository;
    private final EjercicioRepository ejercicioRepository;
    private final PasswordEncoder passwordEncoder;
    private final GeneradorPiezaService generadorPiezaService;

    public DataSeeder(UsuarioRepository usuarioRepository, GrupoRepository grupoRepository,
                       PiezaRepository piezaRepository, EjercicioRepository ejercicioRepository,
                       PasswordEncoder passwordEncoder, GeneradorPiezaService generadorPiezaService) {
        this.usuarioRepository = usuarioRepository;
        this.grupoRepository = grupoRepository;
        this.piezaRepository = piezaRepository;
        this.ejercicioRepository = ejercicioRepository;
        this.passwordEncoder = passwordEncoder;
        this.generadorPiezaService = generadorPiezaService;
    }

    @Override
    public void run(String... args) {
        if (usuarioRepository.count() > 0) {
            return; // ya hay datos (no es el primer arranque): no volver a sembrar
        }

        System.out.println(">> DataSeeder: base de datos vacia, creando usuarios y datos de prueba...");

        Grupo grupo = new Grupo();
        grupo.setNombre("Turno Mañana");
        grupo = grupoRepository.save(grupo);

        nuevoUsuario("Admin TornoTech", "admin@tornotech.com", "Admin123!", Rol.ADMINISTRADOR, null);
        Usuario instructor = nuevoUsuario("Instructor Demo", "instructor@tornotech.com", "Instructor123!", Rol.INSTRUCTOR, null);
        // Email/contraseña de esta cuenta demo se dejan igual aunque el rol paso de EMPLEADO a
        // APRENDIZ -- son solo credenciales de prueba, no hace falta romperlas por el rename.
        nuevoUsuario("Aprendiz Demo", "empleado@tornotech.com", "Empleado123!", Rol.APRENDIZ, grupo);
        nuevoUsuario("Observador Demo", "observador@tornotech.com", "Observador123!", Rol.OBSERVADOR, null);
        // Usuario de prueba adicional (aparte de los 4 anteriores) para probar el flujo de login
        // y el estandar de contraseña estricto (10+, mayuscula, minuscula, numero, simbolo).
        nuevoUsuario("Usuario de Prueba", "prueba@tornotech.com", "Prueba#2026Lms", Rol.APRENDIZ, grupo);

        Pieza pieza = generadorPiezaService.generar(TipoMaquina.TORNO_CNC);
        pieza = piezaRepository.save(pieza);

        Ejercicio ejercicio = new Ejercicio();
        ejercicio.setTitulo("Cilindrado básico de eje escalonado");
        ejercicio.setMaquina(TipoMaquina.TORNO_CNC);
        ejercicio.setDificultad(Dificultad.BASICO);
        ejercicio.setInstructor(instructor);
        ejercicio.setPieza(pieza);
        ejercicio.setDescripcion("Ejercicio de ejemplo generado por DataSeeder para validar la instalacion.");
        ejercicioRepository.save(ejercicio);

        System.out.println(">> DataSeeder: listo. Usuarios de prueba (contraseña entre parentesis):");
        System.out.println("   admin@tornotech.com (Admin123!) - ADMINISTRADOR");
        System.out.println("   instructor@tornotech.com (Instructor123!) - INSTRUCTOR");
        System.out.println("   empleado@tornotech.com (Empleado123!) - APRENDIZ");
        System.out.println("   observador@tornotech.com (Observador123!) - OBSERVADOR");
        System.out.println("   prueba@tornotech.com (Prueba#2026Lms) - APRENDIZ (usuario de prueba adicional)");
    }

    private Usuario nuevoUsuario(String nombre, String email, String passwordPlano, Rol rol, Grupo grupo) {
        Usuario usuario = new Usuario();
        usuario.setNombre(nombre);
        usuario.setEmail(email);
        usuario.setPasswordHash(passwordEncoder.encode(passwordPlano));
        usuario.setRol(rol);
        usuario.setGrupo(grupo);
        usuario.setActivo(true);
        return usuarioRepository.save(usuario);
    }
}
