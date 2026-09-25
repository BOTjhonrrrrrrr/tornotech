# TornoTech LMS — Ruta de mejora

Fecha: 2026-08-15
Este documento reemplaza y amplía a `TornoTech_LMS_Plan_de_Accion.md` (auditoría de requisitos del 2026-08-15 por la tarde) incorporando una revisión de código línea por línea de los 64 archivos del backend y los 21 del frontend, no solo de features faltantes. Ver `ARQUITECTURA.md` para el detalle de qué hay y cómo funciona hoy.

Las correcciones marcadas como **[Ya aplicado]** se hicieron durante esta misma sesión y ya están en el código; el resto son recomendaciones pendientes, ordenadas por prioridad.

---

## Prioridad alta — seguridad, integridad de datos y apariencia de bugs

1. **[Ya aplicado] Escalación horizontal de privilegios en `IntentoController`.** `porUsuario`/`porEjercicio` no verificaban propiedad del dato — cualquier Empleado autenticado podía leer los intentos (código enviado, errores) de cualquier otro usuario cambiando el `{usuarioId}` en la URL. Se agregó el mismo chequeo que ya usaba `ReporteController` (`UsuarioActualService.verificarAccesoUsuario`).

2. **[Ya aplicado] Transacciones faltantes en flujos multi-escritura.** `IntentoService.registrarIntento` guarda un `Intento`, un `ResultadoSimulacion` y, si corresponde, dispara la calificación automática (que a su vez guarda `Evaluacion` + `Certificacion`) — cuatro `save()` sin límite transaccional. Una falla a mitad de camino podía dejar un intento sin resultado, o una evaluación sin certificación. Se agregó `@Transactional` a `IntentoService.registrarIntento` y `EvaluacionService.calificar`.

3. **Ejecutar la migración SQL pendiente de la sesión anterior** (conversión de las 8 columnas `oid`→`text` por el bug de Hibernate/PostgreSQL "Unable to access lob stream"). El código Java ya está corregido; sin la migración, el error puede seguir apareciendo sobre datos existentes.

4. **Botón "Eliminar ejercicio"** en `GestionInstruccion.jsx`. El backend ya expone `DELETE /ejercicios/{id}`; falta el botón en la tabla (con confirmación, porque puede afectar asignaciones/intentos asociados).

5. **Resolver el ícono de campana del Navbar.** Hoy no tiene `onClick`; visualmente sugiere una función que no existe. Conectarlo a `certificacionesPorVencer()` (contador + lista simple) o quitarlo hasta implementarlo — de las dos, es preferible conectarlo porque el dato ya existe y se usa en el Dashboard.

6. **Confirmar visualmente** que el toggle de sidebar y el fin del scroll horizontal (cambios de esta sesión) se ven bien en tu navegador real.

---

## Prioridad media — completa un requisito parcial o corrige un riesgo real de mantenimiento

7. **CRUD de grupos en el frontend.** Hoy se puede *asignar* un usuario a un grupo existente, pero no hay pantalla para crear, renombrar o eliminar grupos — el backend (`GrupoController`) ya soporta `POST`/`DELETE` (falta `PUT` para renombrar). Encaja como una sección nueva en `AdminUsuarios.jsx`.

8. **Validación a nivel de entidad, no solo de DTO.** Los endpoints que reciben un DTO (`record`) validan con `@Valid` de forma consistente, pero varios controllers reciben directamente una entidad JPA como `@RequestBody` sin ninguna anotación de Bean Validation en el modelo: `AsignacionController.asignar`, `EjercicioController.crear/actualizar`, `GrupoController.crear`, `PiezaController.crearManual`, y notablemente `UsuarioController.actualizar` (que es más débil que su propio `crear`, tres líneas más arriba, que sí usa `@Valid CrearUsuarioRequest`). Agregar anotaciones (`@NotBlank`, `@Size`, etc.) directamente en `model/` o migrar estos endpoints a DTOs dedicados.

9. **Endpoints que reciben la entidad completa como request body** (`UsuarioController.actualizar`, `EjercicioController.actualizar`) dependen de que el controller copie a mano solo los campos correctos hacia la entidad gestionada — hoy funciona porque cada método es cuidadoso (por ejemplo, `passwordHash` es `WRITE_ONLY` y `actualizar` nunca lo lee), pero es un patrón frágil: un futuro `set...()` agregado sin pensarlo podría reabrir un problema de sobre-asignación de campos (mass assignment). Migrar a DTOs de actualización explícitos es la solución de fondo.

10. **CORS ya no depende de un valor hardcodeado** — [Ya aplicado] `SecurityConfig` ahora lee `lms.frontend.url` (con el mismo valor de desarrollo como default, así que no cambia nada hoy). Falta: al desplegar, setear esa propiedad a la URL real en `application.properties` o como variable de entorno.

11. **`DataSeeder` corre en cualquier entorno, incluida una futura base de producción vacía**, e imprime credenciales de ejemplo en texto plano por consola (`config/DataSeeder.java`). Ya está documentado en su propio Javadoc como un paso manual pendiente antes de desplegar; conviene formalizarlo con un `@Profile("dev")` (o una bandera en `application.properties`) para que sea imposible olvidarlo, en vez de depender de que alguien lo recuerde.

12. **Normalizar el manejo de errores en las cargas iniciales del frontend** — **[Ya aplicado]**. `AdminUsuarios`, `CalificarIntentos`, `MisCertificados`, `GestionInstruccion` y `Reportes` no capturaban errores en su fetch inicial (a diferencia de `Dashboard`/`SimuladorCNC`, que sí). Las siete pantallas ahora siguen el mismo patrón: estado de error + mensaje visible si el backend no responde.

13. **Debounce opcional en el editor de código** para acercar RF-11 a "tiempo real": disparar `validar()` automáticamente unos cientos de milisegundos después de dejar de escribir, en vez de depender solo del botón "Validate Code".

---

## Prioridad baja — pulido, consistencia visual y deuda de calidad

14. **Textos de interfaz mezclados en inglés dentro de un producto en español.** `GestionInstruccion.jsx` ("Create New Exercise", "Exercise Library", encabezados de tabla "EX-ID"/"Module Name"), `SimuladorCNC.jsx` ("ISO Code Editor", "Validate Code", "Execute Simulation", "2D Simulation Canvas") y `Reportes.jsx` ("System Analytics", "CSV EXPORT", "PDF REPORT") tienen texto en inglés heredado del mockup original, mientras el resto del sistema (Login, Registro, AdminUsuarios, CalificarIntentos, MisCertificados, Dashboard) es 100% español. Traducir estas cadenas para que la experiencia sea consistente para el público hispanohablante de la planta.

15. **Botones decorativos sin funcionalidad**, que hoy se ven terminados pero no hacen nada: Zoom In/Out, Stop y Pause en `SimuladorCNC.jsx`; la campana de notificaciones, el buscador y el botón de ayuda en `Navbar.jsx`; Settings y Support en `Sidebar.jsx`. No es necesario implementarlos todos ya, pero sí decidir por cada uno: implementar, ocultar, o marcar visualmente como "próximamente" (`disabled` + tooltip) para que no parezcan errores durante una demo.

16. **Tamaños de texto que no usan los tokens del sistema de diseño.** Prácticamente todos los `<input>`/`<select>` del proyecto usan la clase genérica de Tailwind `text-sm` en vez del token temático `text-body-md`/`text-label-sm` definido en `tailwind.config.js` (por ejemplo, en `Login.jsx`, `Registro.jsx`, `AdminUsuarios.jsx`, `GestionInstruccion.jsx`, `CalificarIntentos.jsx` — decenas de ocurrencias). No rompe nada visualmente hoy porque los valores son parecidos, pero significa que un futuro ajuste de la escala tipográfica del sistema de diseño no afectaría a estos campos. Es un cambio mecánico pero amplio (~10 archivos); conviene hacerlo de una vez con revisión visual, no a ciegas.

17. **Color hardcodeado fuera de la paleta** en `Dashboard.jsx` (`bg-[#331100]` para la tarjeta de certificaciones por vencer) — no tiene token equivalente en `tailwind.config.js`. Definir un token semántico (por ejemplo `warning-container`) y usarlo ahí. (El uso de colores planos en la plantilla de impresión de `MisCertificados.jsx` es intencional — el certificado debe imprimirse en blanco y negro sin importar el tema oscuro de la app — y no necesita cambiar.)

18. **Lógica de tabla duplicada.** `AdminUsuarios.jsx`, `GestionInstruccion.jsx` y `CalificarIntentos.jsx` repiten independientemente el mismo patrón (estado de carga → `Promise.all` → fila de "Cargando…" → fila de "sin datos"). Extraer un hook compartido (`useApiList`) y/o un componente `<EmptyState>` reduciría la duplicación y evitaría que las tres implementaciones seudo-idénticas se desincronicen con el tiempo (como ya pasó: solo dos de las tres tenían manejo de errores antes de esta sesión).

19. **Helper JSON duplicado en el backend.** `IntentoService` y `ValidacionService` tienen, cada uno por su cuenta, un método `aJson(Object)` casi idéntico con su propia instancia de `ObjectMapper`. Extraerlo a una clase utilitaria compartida o a un `@Bean` de `ObjectMapper` inyectado.

20. **`IsoInterpreterService` concentra tokenización, interpretación modal de G-code, geometría de arcos y detección de colisión en una sola clase de ~480 líneas.** Está bien comentada y es cohesiva ("todo lo que es interpretar ISO"), pero es candidata a dividirse (por ejemplo, aislar la geometría de arcos en su propia clase) si el set de códigos soportados sigue creciendo.

21. **`db/schema.sql` está desactualizado** respecto al modelo JPA actual (no refleja los campos agregados esta sesión como `codigoReferencia`, los criterios de validación, ni la corrección de `@Lob`→`TEXT`). Si en algún momento se decide activar Flyway (ya está en el proyecto, solo deshabilitado), este archivo es el punto de partida — conviene regenerarlo desde el esquema real antes de esa migración.

22. **Ausencia total de pruebas automatizadas.** `src/test` está vacío tanto en backend como en frontend, pese a que `spring-boot-starter-test` y `spring-security-test` ya están en `pom.xml`. Es el hueco de calidad más grande del proyecto. Punto de partida recomendado, no exhaustivo: unit tests de `IsoInterpreterService` (el parser es la pieza más compleja y con más lógica de negocio pura, fácil de testear sin levantar Spring) y de `ValidacionService`; en frontend, un smoke test de login + envío de un intento.

23. **Verificación manual cross-browser** (Chrome/Edge/Firefox) para cerrar formalmente RNF-03 — no hay evidencia de que se haya probado fuera del navegador principal de desarrollo.

---

## Cómo leer esta lista

Los puntos 1-6 son los únicos que razonablemente podrían notarse en una demo en vivo o representar un riesgo real de datos si no se atienden pronto (y 1, 2 y 12 ya están resueltos). Los puntos 7-13 completan funcionalidad que hoy es parcial pero no rompe nada. Los puntos 14-23 son pulido, consistencia y deuda técnica: mejoran el proyecto pero no bloquean nada de lo que ya funciona.
