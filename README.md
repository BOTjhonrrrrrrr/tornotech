# TornoTech LMS — Setup del proyecto

Estructura entregada:

```
TornoTech_LMS_Documentacion_Previa.md   Documento de requisitos + UML + ER + arquitectura
tornotech-lms-backend/                   Spring Boot (Java 17, Maven)
tornotech-lms-frontend/                  React + Vite + Tailwind
```

Este es un **scaffold funcional**, no la app terminada: define la estructura, el modelo de datos,
seguridad basica por rol y un motor de simulacion ISO inicial (G00/G01, sin G02/G03 todavia).
Cada pantalla tiene comentarios `TODO` marcando lo que falta conectar o ampliar.

---

## 1. Base de datos (PostgreSQL)

```bash
createdb tornotech_lms
psql -d tornotech_lms -U tu_usuario -f tornotech-lms-backend/db/schema.sql
```

O simplemente arranca el backend: con `spring.jpa.hibernate.ddl-auto=update` (ya configurado en
`application.properties`), Hibernate crea las tablas solo. `db/schema.sql` queda como referencia
versionada y como base si mas adelante migran a Flyway (ya esta la dependencia agregada, solo hay
que poner `spring.flyway.enabled=true` y mover el script a `db/migration/V1__init.sql`).

Ajusta usuario/contraseña en `tornotech-lms-backend/src/main/resources/application.properties`:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/tornotech_lms
spring.datasource.username=tornotech
spring.datasource.password=change_me
```

---

## 2. Backend (Spring Boot)

```bash
cd tornotech-lms-backend
mvn spring-boot:run
```

Corre en **http://localhost:8081** (se cambio de 8080 a proposito, para que no choque con otros
servicios que ya tengas corriendo localmente).

Endpoints principales:

| Módulo | Endpoint | Pantalla |
|---|---|---|
| Auth | `POST /api/auth/login` | — |
| Usuarios | `/api/usuarios` | Administración |
| Ejercicios / Piezas | `/api/ejercicios`, `/api/piezas`, `/api/asignaciones` | Gestión de instrucción |
| Simulación | `POST /api/simulacion/ejecutar`, `/api/intentos` | Simulador CNC |
| Evaluación | `POST /api/evaluaciones/calificar` | Simulador CNC / Gestión de instrucción |
| Reportes | `/api/reportes/dashboard`, `/api/reportes/certificaciones/por-vencer` | Dashboard / Reportes |

**Usuarios de prueba**: al arrancar por primera vez (tabla `usuario` vacía), `DataSeeder`
crea automáticamente 4 cuentas — no hace falta insertarlas a mano:

| Email | Password | Rol |
|---|---|---|
| admin@tornotech.com | Admin123! | ADMINISTRADOR |
| instructor@tornotech.com | Instructor123! | INSTRUCTOR |
| empleado@tornotech.com | Empleado123! | EMPLEADO |
| observador@tornotech.com | Observador123! | OBSERVADOR |

También crea un grupo, una pieza y un ejercicio de ejemplo para que las pantallas no arranquen
vacías. `DataSeeder` solo corre si la tabla está vacía — en arranques siguientes no duplica nada
(ver sección de verificación de persistencia más abajo).

**Pendiente antes de producción:** mover `lms.jwt.secret` a una variable de entorno (no dejarlo en
`application.properties`), y sacar el `usuarioId` de los endpoints de `IntentoController` /
`EvaluacionController` para tomarlo del JWT en vez del body.

---

## 3. Frontend (React + Tailwind)

```bash
cd tornotech-lms-frontend
npm install
npm run dev
```

Corre en **http://localhost:5173**. Ya apunta al backend en `:8081` vía `src/api/client.js`
(configurable con `VITE_API_URL`, ver `.env.example`).

Pantallas creadas: `Login`, `Dashboard`, `Gestión de instrucción`, `Simulador CNC`, `Reportes` — con
navegación lateral, autenticación real (JWT guardado en `localStorage`, rutas protegidas) y
llamadas reales a la API.

---

## 4. Verificar que los datos persisten en PostgreSQL

Con el backend y el frontend corriendo:

1. Entra a `http://localhost:5173`, inicia sesión con `admin@tornotech.com` / `Admin123!`.
2. Ve a **Gestión de instrucción** y crea un ejercicio nuevo (dale un título distinto al de
   ejemplo, para reconocerlo).
3. **Detén el backend** (Ctrl+C en la terminal, o el botón de stop en VS Code) y vuelve a
   arrancarlo (`mvn spring-boot:run` o Run en VS Code).
4. Revisa la consola del backend: **no debe volver a imprimir** el mensaje
   `DataSeeder: base de datos vacia...` — si no aparece, significa que Hibernate encontró
   usuarios ya existentes en Postgres (los datos sobrevivieron al reinicio).
5. Vuelve a `http://localhost:5173`, inicia sesión de nuevo y entra a **Gestión de instrucción**:
   el ejercicio que creaste en el paso 2 debe seguir en la lista.

Para confirmarlo directo en la base de datos (opcional, más contundente):

```bash
psql -U tu_usuario -d tornotech_lms -c "SELECT id, titulo FROM ejercicio;"
psql -U tu_usuario -d tornotech_lms -c "SELECT id, email, rol FROM usuario;"
```

Si el ejercicio y los 4 usuarios de prueba aparecen ahí (y siguen apareciendo tras reiniciar el
backend varias veces sin duplicarse), la persistencia está funcionando correctamente.

---

## 5. Qué falta (siguientes incrementos)

1. **G02/G03** (interpolación circular) en `IsoInterpreterService` — hoy solo soporta G00/G01.
2. Control de acceso por rol en el frontend (ocultar/mostrar menús según rol; el backend ya lo
   exige a nivel de API).
3. Notificaciones reales de certificaciones por vencer (RF-16) — hoy solo se consultan bajo demanda.
4. Mover `lms.jwt.secret` a una variable de entorno antes de cualquier despliegue real.
5. Tests (unitarios del intérprete ISO son el más valioso por ahora — es la pieza más compleja).
