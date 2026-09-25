# TornoTech LMS — Arquitectura, tecnologías y objetivos cumplidos

Fecha de esta revisión: 2026-08-15

Este documento describe qué es TornoTech LMS, con qué tecnologías y patrones está construido, qué hace cada componente del código, y en qué medida se cumplen los requisitos definidos en `TornoTech_LMS_Documentacion_Previa.md`. Complementa a `TornoTech_LMS_Plan_de_Accion.md` (auditoría de requisitos) y a `RUTA_DE_MEJORA.md` (próximos pasos): este archivo explica *qué hay y cómo funciona*; los otros dos explican *qué falta y en qué orden abordarlo*.

---

## 1. Qué es el sistema

TornoTech LMS es una aplicación web de capacitación para operarios de máquinas CNC (torno y fresadora). Permite a un instructor crear ejercicios de programación en código ISO (G/M), asignarlos a empleados o grupos, y a un empleado escribir ese código en un editor, validarlo y ver el resultado como una simulación 2D de la trayectoria de corte sobre la pieza — sin usar una máquina real. El sistema registra cada intento, lo califica (automática o manualmente), emite certificaciones con fecha de vencimiento, y ofrece reportes de avance para instructores, observadores y administradores.

---

## 2. Stack tecnológico

### Backend
- **Java 17** sobre **Spring Boot 3.3.2** (`spring-boot-starter-parent`).
- **Spring Web** — API REST.
- **Spring Data JPA** + **PostgreSQL** — persistencia. El esquema se gestiona con `spring.jpa.hibernate.ddl-auto=update` en desarrollo; existe un `db/schema.sql` de referencia y las dependencias de **Flyway** ya están en el proyecto (`flyway-core`, `flyway-database-postgresql`) para cuando se decida versionar el esquema formalmente, aunque hoy están deshabilitadas (`spring.flyway.enabled=false`).
- **Spring Security** + **JWT** (librería `jjwt` 0.12.5) — autenticación sin sesión (`SessionCreationPolicy.STATELESS`) y autorización basada en roles (RBAC).
- **Bean Validation** (`spring-boot-starter-validation`) — valida los DTOs de entrada en los endpoints principales.
- **Lombok** — genera getters/setters de las entidades JPA, usado de forma consistente en todo el modelo.
- **spring-boot-starter-test** + **spring-security-test** — están en el proyecto como dependencias, pero **aún no hay pruebas escritas** (ver Ruta de mejora).

### Frontend
- **React 18** + **Vite 5** como bundler/dev server.
- **React Router 6** — enrutamiento y control de acceso por rol (`ProtectedRoute`).
- **Axios** — cliente HTTP, con interceptor que adjunta el JWT y redirige a `/login` ante un 401.
- **Tailwind CSS 3** — sistema de diseño propio ("Industrial Minimalism", tema oscuro), con paleta, tipografía y espaciados definidos como tokens en `tailwind.config.js` (colores como `on-surface`/`surface-container`, tamaños como `text-body-md`, espaciados como `p-margin`).
- **lucide-react** — íconos.
- Sin librerías de gráficos ni de canvas de terceros: la simulación 2D y el plano técnico están dibujados a mano como **SVG** dentro de componentes React (`TrayectoriaCanvas.jsx`, `PlanoTecnico.jsx`), usando `ResizeObserver` para ajustarse al tamaño real del contenedor.

### Base de datos
**PostgreSQL**, con 9 tablas principales (`usuario`, `grupo`, `ejercicio`, `pieza`, `asignacion`, `intento`, `resultado_simulacion`, `evaluacion`, `certificacion`), correspondientes 1 a 1 con el modelo entidad-relación del documento de requisitos (sección 8).

---

## 3. Arquitectura general

El sistema sigue una arquitectura cliente-servidor de 3 capas, tal como se propuso en el documento de requisitos original (sección 9):

```
Frontend (SPA React)  →  API REST (Spring Boot)  →  Base de datos (PostgreSQL)
   Editor de código        Controllers → Services         9 tablas relacionales
   Canvas 2D (SVG)          → Repositories (JPA)
   Paneles de gestión       Seguridad JWT + RBAC
```

Dentro del backend, cada request pasa por: **filtro JWT** (`JwtAuthFilter`, valida el token y puebla el contexto de seguridad) → **reglas de autorización por rol** (`SecurityConfig`, decide si el rol autenticado puede llegar a esa ruta/método HTTP) → **Controller** (recibe el request, delega la lógica) → **Service** (reglas de negocio: simulación, validación automática, calificación, reportes) → **Repository** (acceso a datos vía Spring Data JPA). Los DTOs (`record` de Java) se usan para las entradas/salidas que no deben exponer el modelo interno completo — por ejemplo, nunca se serializa `passwordHash` ni el código "solución" (`codigoReferencia`) de un ejercicio.

---

## 4. Componentes del backend

Organizado en 9 paquetes bajo `com.tornotech.lms`, 64 archivos Java en total:

**`controller`** — 11 controladores REST, uno por recurso: `AuthController`/`RegistroController` (login y auto-registro), `UsuarioController` (RF-01/02/03), `GrupoController` (RF-03), `EjercicioController` (RF-04, más el endpoint de plano de referencia), `PiezaController` (RF-05), `AsignacionController` (RF-06), `IntentoController` (RF-13), `EvaluacionController` (RF-14), `ReporteController` (RF-16/17), `SimulacionController` (ejecuta la simulación bajo demanda desde el editor, sin persistir).

**`service`** — la lógica de negocio central: `IsoInterpreterService` (dentro de `simulacion/`, es el motor de simulación: interpreta el código G/M, calcula la trayectoria, detecta colisiones contra la pieza, y para torno lleva el perfil de material remanente), `ValidacionService` (motor de calificación automática con 3 criterios opcionales: colisión/sintaxis, tolerancia dimensional, y uso correcto de códigos/estrategia esperada), `IntentoService` (orquesta simular → validar → guardar intento → auto-calificar si corresponde), `EvaluacionService` (califica y, si aprueba, emite la certificación con vigencia), `GeneradorPiezaService` (genera piezas de práctica aleatorias parametrizables), `ReporteService` (agregados para dashboard y reportes).

**`security`** — `JwtUtil` (emite/valida tokens), `JwtAuthFilter` (filtro que se ejecuta en cada request), `UsuarioActualService` (resuelve el usuario autenticado desde el token y centraliza la regla "solo tus propios datos, salvo que tengas un rol de supervisión" — es el componente que evita que un Empleado vea datos de otro usuario cambiando un ID en la URL).

**`model`** — 9 entidades JPA (`Usuario`, `Grupo`, `Ejercicio`, `Pieza`, `Asignacion`, `Intento`, `ResultadoSimulacion`, `Evaluacion`, `Certificacion`) y 7 enums (`Rol`, `TipoMaquina`, `Dificultad`, `EstadoEvaluacion`, `ResultadoAutomatico`, `EstadoCertificacion`, `EstrategiaEsperada`), reflejando exactamente el modelo entidad-relación de la documentación previa.

**`dto`** — 9 `record` de entrada/salida para los endpoints que no deben exponer directamente una entidad (login, registro, calificar, enviar intento, resumen de dashboard, etc.).

**`config`** — `SecurityConfig` (cadena de filtros, CORS, reglas de autorización por rol), `DataSeeder` (crea usuarios/ejercicio de ejemplo la primera vez que arranca sobre una base vacía), `GlobalExceptionHandler` (traduce excepciones de negocio a respuestas HTTP consistentes).

**`simulacion`** — además de `IsoInterpreterService`, los DTOs propios del motor (`ResultadoSimulacionDTO`, `SegmentoTrayectoria`, `PuntoPerfil`, `ErrorPrograma`, `PlanoDTO`).

**`util`** — `PasswordValidator` (política de contraseñas: 10+ caracteres, mayúscula, minúscula, número y símbolo).

---

## 5. Componentes del frontend

**Infraestructura** — `api/client.js` (instancia de Axios con JWT automático), `context/AuthContext.jsx` (estado global de sesión), `components/auth/ProtectedRoute.jsx` (redirige a `/login` o a `/acceso-denegado` según el rol requerido por cada ruta, en espejo exacto de `SecurityConfig` del backend).

**Layout compartido** — `Navbar.jsx` (barra superior fija), `Sidebar.jsx` (navegación lateral, ocultable, con enlaces filtrados por rol), `PageLayout.jsx` (arma ambos alrededor del contenido de cada página).

**Componentes del simulador** — `CodeEditor.jsx` (editor de texto con numeración de línea y resaltado de errores), `TrayectoriaCanvas.jsx` (SVG que dibuja la trayectoria de corte en vivo, diferenciando torno/fresadora), `PlanoTecnico.jsx` (SVG del plano de referencia con cotas, en un tono visual distinto al de la trayectoria en vivo para no confundirlos).

**Pantallas (`pages/`)** — `Login.jsx`/`Registro.jsx` (acceso y auto-registro), `Dashboard.jsx` (resumen + alertas de certificaciones por vencer), `AdminUsuarios.jsx` (RF-01/02/03), `GestionInstruccion.jsx` (RF-04/05/06: crear/editar ejercicios, criterios de calificación automática, plano de referencia, asignación), `SimuladorCNC.jsx` (RF-07 a RF-12: la pantalla principal del alumno), `CalificarIntentos.jsx` (RF-14), `Reportes.jsx` (RF-17), `MisCertificados.jsx` (RF-15/16), `AccesoDenegado.jsx` (pantalla de 403).

Cada ruta en `App.jsx` declara qué roles pueden acceder, y `Sidebar.jsx` filtra sus enlaces con exactamente las mismas listas de roles — se verificó en esta revisión que ambas listas coinciden en las 8 rutas protegidas, sin ningún enlace visible que lleve a una pantalla bloqueada.

---

## 6. Metodologías y patrones de diseño aplicados

- **Autenticación sin estado (JWT) + autorización por rol (RBAC) en dos capas**: primero a nivel de ruta HTTP (`SecurityConfig`, quién puede *llegar* al endpoint) y luego a nivel de dato (`UsuarioActualService.verificarAccesoUsuario`, si además puede ver *ese* registro puntual). Este segundo nivel es el que impide que un Empleado autenticado lea el progreso o los intentos de otro Empleado.
- **DTOs de solo escritura para datos sensibles**: `Usuario.passwordHash` y `Ejercicio.codigoReferencia` (el código "solución" de un ejercicio) usan `@JsonProperty(access = WRITE_ONLY)` — se pueden enviar al backend pero nunca se devuelven en una respuesta JSON, evitando que el hash de contraseña o la respuesta del ejercicio se filtren por accidente en ningún endpoint futuro.
- **Simulación en el servidor, no en el cliente**: el código ISO se interpreta y simula en `IsoInterpreterService` (backend), tanto al ejecutar como al generar el plano de referencia. Esto evita duplicar la lógica de interpretación de G-code en JavaScript y garantiza que el resultado que ve el alumno sea el mismo que se persiste y califica.
- **Calificación automática de tres criterios, todos opcionales**: colisión/errores de sintaxis, tolerancia dimensional respecto a un objetivo, y uso de códigos/estrategia esperada. Si el instructor no define un criterio, ese criterio simplemente no se evalúa — un ejercicio puede quedar completamente abierto a calificación manual, o totalmente automatizado, según lo que el instructor configure.
- **Generación aleatoria de piezas parametrizable** (RF-05), para que cada práctica no dependa de datos cargados a mano.
- **Diseño responsivo con medición real del contenedor**: los canvas SVG usan `ResizeObserver` en vez de un `viewBox` fijo, para adaptarse al espacio disponible en cualquier tamaño de pantalla sin recortar la pieza ni forzar scroll.
- **Sistema de diseño con tokens propios**: la paleta, tipografía y espaciados del tema oscuro están centralizados en `tailwind.config.js`, no repartidos como colores sueltos en cada componente — la revisión de esta sesión confirmó que esto se respeta de forma consistente en casi todo el frontend (con dos excepciones puntuales documentadas en la Ruta de mejora).

---

## 7. Objetivos cumplidos (detalle por requisito)

De los 17 requisitos funcionales originales, **13 están completos, 4 parciales y ninguno sin empezar**. Detalle de cómo se cumple cada uno:

**Gestión de usuarios y roles (RF-01 a RF-03)**: un Administrador crea, edita, desactiva y reactiva cuentas desde `AdminUsuarios.jsx`; el "eliminar" es un soft-delete (`activo=false`), verificado en el login (`AuthController` rechaza a un usuario inactivo). Los cuatro roles (Administrador, Instructor, Empleado, Observador) están implementados de punta a punta, desde el enum `Rol` hasta las reglas de `SecurityConfig` y las rutas protegidas del frontend. La agrupación de empleados por grupo existe y se puede *asignar*, aunque falta una pantalla para *crear* grupos nuevos (ver Ruta de mejora).

**Ejercicios y piezas (RF-04 a RF-06)**: un Instructor crea y edita ejercicios completos (título, máquina, dificultad, pieza, criterios de calificación, plano de referencia) desde `GestionInstruccion.jsx`. El generador aleatorio de piezas (`GeneradorPiezaService`) produce geometría parametrizada por máquina. La asignación manual a un empleado o a un grupo completo está implementada con una interfaz de chips que muestra y permite remover asignaciones existentes.

**Editor y validador ISO (RF-07 a RF-09)**: el editor (`CodeEditor.jsx`) resalta las líneas con error directamente sobre el código. La validación de sintaxis y la detección de colisiones ocurren en `IsoInterpreterService`, que reconoce el set de códigos G/M soportado (incluyendo interpolación circular G02/G03) y señala tanto errores de sintaxis como trayectorias que exceden los límites de la pieza.

**Simulación 2D (RF-10 a RF-12)**: `TrayectoriaCanvas.jsx` dibuja la trayectoria resultante sobre la pieza en tiempo real al presionar "Validate Code", diferenciando lógica y ejes de torno (Z horizontal, X reflejado) y fresadora. El feedback es inmediato al validar (RNF-01 se cumple), aunque no hay validación automática mientras se escribe cada carácter — es una mejora incremental posible, no un requisito incumplido.

**Seguimiento, evaluación y certificación (RF-13 a RF-16)**: cada intento queda registrado con su código, resultado y errores (`Intento` + `ResultadoSimulacion`). Un Instructor califica desde `CalificarIntentos.jsx`, viendo tanto el código como la sugerencia del sistema de validación automática. Al aprobar, se emite una `Certificacion` con fecha de emisión y vencimiento (12 meses por defecto). El vencimiento se comunica en tres lugares: badges de estado (Vigente/Por vencer/Vencida) en `MisCertificados.jsx`, un widget "Por vencer (30 días)" en el Dashboard, y el listado completo en Reportes — la única pieza suelta es que el ícono de campana del Navbar, que visualmente sugeriría una notificación push, hoy es decorativo (ver Ruta de mejora).

**Reportes (RF-17)**: `Reportes.jsx` y `ReporteService` dan progreso agregado y por certificación, visible para Instructor, Observador y Administrador, con exportación a CSV e impresión.

**No funcionales**: la autenticación y el RBAC (RNF-04) están implementados en dos capas como se explicó en la sección 6; esta misma revisión encontró y corrigió una escalación horizontal de privilegios que existía en `IntentoController` (un Empleado podía leer los intentos de otro usuario cambiando un ID en la URL) — ver más detalle en `RUTA_DE_MEJORA.md`. La escalabilidad a ~50 usuarios (RNF-05) está cubierta con índices en las columnas de llave foránea más consultadas. La modularidad (RNF-08) se refleja en la separación clara Controller/Service/Repository y en que el motor de simulación, el validador y el generador de piezas son módulos independientes, tal como pedía la arquitectura propuesta originalmente.

---

## 8. Verificación realizada en esta sesión

Como parte de esta revisión se auditó la totalidad del código (64 archivos backend, 21 archivos frontend) en busca de inconsistencias estructurales, no solo de features faltantes. Se verificó sintaxis completa (balance de llaves en Java, parseo AST de todo el frontend) sin errores, y se aplicaron las siguientes correcciones concretas, ya incluidas en el código actual:

- **Seguridad**: se agregó la verificación de propiedad de datos que faltaba en `IntentoController` (`porUsuario`/`porEjercicio`), siguiendo el mismo patrón ya usado en `ReporteController` — antes, cualquier Empleado autenticado podía leer los intentos de cualquier otro usuario.
- **Integridad de datos**: se agregó `@Transactional` a `IntentoService.registrarIntento` y `EvaluacionService.calificar`, que antes hacían varios `save()` sin límite transaccional — una falla a mitad de camino podía dejar un intento sin su resultado de simulación, o una evaluación sin su certificación.
- **Limpieza**: import sin usar en `ReporteService`, comentario desactualizado en `UsuarioController`, y la URL del frontend para CORS (que estaba hardcodeada aunque ya existía la propiedad `lms.frontend.url` para ese fin, sin que nadie la leyera) ahora se lee de configuración.
- **Consistencia de frontend**: cinco pantallas (`AdminUsuarios`, `CalificarIntentos`, `MisCertificados`, `GestionInstruccion`, `Reportes`) no capturaban errores en su carga inicial de datos, a diferencia de `Dashboard`/`SimuladorCNC` que ya lo hacían — ahora las siete pantallas siguen el mismo patrón: si el backend no responde, se muestra un mensaje en vez de una pantalla vacía sin explicación.

El resto de los hallazgos de esta auditoría (funciones decorativas sin conectar, textos de interfaz en inglés dentro de un producto en español, tamaños de texto que no usan los tokens del sistema de diseño, ausencia total de pruebas automatizadas, etc.) se documentan como pendientes priorizados en `RUTA_DE_MEJORA.md`, en vez de corregirse a ciegas en esta sesión — son cambios más amplios o más visibles que conviene revisar con el equipo antes de aplicar.
