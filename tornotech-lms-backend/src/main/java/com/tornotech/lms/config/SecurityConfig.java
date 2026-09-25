package com.tornotech.lms.config;

import com.tornotech.lms.security.JwtAuthFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Seguridad basada en JWT y roles: ADMINISTRADOR, INSTRUCTOR, APRENDIZ, OBSERVADOR.
 * Ajustar los matchers conforme se agreguen endpoints reales.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    // Antes estaba hardcodeado a "http://localhost:5173" aca abajo mientras application.properties
    // ya definia lms.frontend.url para exactamente este propósito, sin que nadie lo leyera (config
    // muerta). El default coincide con el valor que tenia hardcodeado, asi que el comportamiento no
    // cambia en desarrollo; en despliegue basta con setear lms.frontend.url a la URL real.
    @Value("${lms.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                // Lectura de usuarios: tambien INSTRUCTOR (necesita listar empleados para asignarles
                // ejercicios, ver AsignacionController). Crear/editar/desactivar sigue siendo solo Admin.
                .requestMatchers(HttpMethod.GET, "/api/usuarios/**").hasAnyRole("ADMINISTRADOR", "INSTRUCTOR")
                .requestMatchers("/api/usuarios/**").hasRole("ADMINISTRADOR")
                .requestMatchers(HttpMethod.GET, "/api/grupos/**").hasAnyRole("ADMINISTRADOR", "INSTRUCTOR")
                .requestMatchers("/api/grupos/**").hasRole("ADMINISTRADOR")
                // Lectura de ejercicios: cualquier rol autenticado (el Empleado necesita verlos
                // en el Simulador CNC). Crear/editar/borrar: solo Admin/Instructor.
                .requestMatchers(HttpMethod.GET, "/api/ejercicios/**").authenticated()
                .requestMatchers("/api/ejercicios/**").hasAnyRole("ADMINISTRADOR", "INSTRUCTOR")
                .requestMatchers("/api/piezas/**", "/api/asignaciones/**").hasAnyRole("ADMINISTRADOR", "INSTRUCTOR")
                .requestMatchers("/api/evaluaciones/**").hasAnyRole("ADMINISTRADOR", "INSTRUCTOR")
                // Progreso/certificaciones/insignias de UN usuario: tambien el propio APRENDIZ (RF-17
                // personal). El resto de /api/reportes/** (dashboard agregado, por-vencer general)
                // sigue siendo solo para quien administra/instruye/observa la operacion completa.
                .requestMatchers(HttpMethod.GET, "/api/reportes/progreso/usuario/**",
                        "/api/reportes/certificaciones/usuario/**", "/api/reportes/insignias/usuario/**",
                        "/api/reportes/actividad/usuario/**")
                    .hasAnyRole("ADMINISTRADOR", "INSTRUCTOR", "OBSERVADOR", "APRENDIZ")
                .requestMatchers("/api/reportes/**").hasAnyRole("ADMINISTRADOR", "INSTRUCTOR", "OBSERVADOR")
                .requestMatchers("/api/intentos/**", "/api/simulacion/**").hasAnyRole("ADMINISTRADOR", "INSTRUCTOR", "APRENDIZ")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(frontendUrl));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
