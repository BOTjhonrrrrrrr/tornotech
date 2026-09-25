
# TornoTech LMS — Auditoría de requisitos y plan de acción

Fecha: 2026-08-15
Base de comparación: `TornoTech_LMS_Documentacion_Previa.md` (RF-01 a RF-17, RNF-01 a RNF-08)

Este documento audita el estado real del código (backend Spring Boot + frontend React) contra los requisitos funcionales y no funcionales originales, y propone un orden de trabajo para los pendientes.

---

## 1. Resumen ejecutivo

El sistema cubre el flujo completo de punta a punta: login/roles, editor+validador ISO, simulación 2D (torno y fresadora), asignación de ejercicios, calificación, certificaciones con vencimiento, reportes y plano de referencia. La mayoría de los RF están **completos**. Los pendientes reales son puntuales (no arquitectónicos): UI de gestión de grupos, botón de eliminar ejercicio, campana de notificaciones sin funcionalidad, y ausencia total de pruebas automatizadas. Además quedan dos acciones operativas de la sesión anterior sin confirmar: la migración SQL del bug de LOB y la verificación visual final del sidebar/scroll en el navegador real del usuario.

---

## 2. Matriz de requisitos funcionales

| RF | Requisito | Estado | Nota |
|---|---|---|---|
| RF-01 | CRUD de usuarios (crear/editar/desactivar/eliminar) | Completo | `AdminUsuarios.jsx` + `UsuarioController`. "Eliminar" es soft-delete (`activo=false`), verificado en `AuthController` al hacer login. No hay borrado físico — es la práctica correcta para no romper historial de intentos/certificaciones, pero vale confirmarlo con el instructor si esperaba borrado real. |
| RF-02 | Asignar uno de 4 roles | Completo | Selector de rol en `AdminUsuarios.jsx`, enum `Rol` respetado en `SecurityConfig` y `ProtectedRoute`. |
| RF-03 | Agrupar empleados por grupo/equipo | **Parcial** | Se puede *asignar* un usuario a un grupo existente (`AdminUsuarios.jsx`), pero no hay pantalla para **crear, renombrar o eliminar grupos** — el backend (`GrupoController`) ya soporta `POST`/`DELETE`, falta exponerlo. |
| RF-04 | Instructor crea/edita/elimina ejercicios | **Parcial** | Crear y editar están completos en `GestionInstruccion.jsx` (implementado esta sesión). El backend ya tiene `DELETE /ejercicios/{id}`, pero la UI no tiene botón de eliminar. |
| RF-05 | Generador aleatorio de piezas parametrizable | Completo | `GeneradorPiezaService` + flujo en `GestionInstruccion.jsx`. |
| RF-06 | Asignación manual a empleado o grupo | Completo | UI de asignación con chips y remoción, implementada esta sesión. |
| RF-07 | Editor de texto para código ISO | Completo | `CodeEditor.jsx`. |
| RF-08 | Validación de sintaxis antes de ejecutar | Completo | `IsoInterpreterService` + `ValidacionService`. |
| RF-09 | Detección de errores/colisiones | Completo | Errores de sintaxis, códigos no reconocidos y colisión contra la pieza, mostrados en el canvas y en el panel de advertencia. |
| RF-10 | Visualización 2D de trayectoria sobre la pieza | Completo | `TrayectoriaCanvas.jsx` (responsive, con ResizeObserver). |
| RF-11 | Feedback en tiempo real al ejecutar/modificar | **Parcial** | El feedback es inmediato al presionar "Validate Code", pero no hay debounce automático mientras se escribe (RNF-01 pide <1s percibido, que sí se cumple *al validar*, pero la simulación no se re-dispara sola con cada tecla). Aceptable para un LMS de práctica; mencionar como mejora opcional. |
| RF-12 | Distinguir torno vs fresadora (ejes/lógica) | Completo | `esTorno` en frontend, `TipoMaquina` en backend, ejes Z/X espejados correctamente para torno. |
| RF-13 | Registrar cada intento (código, resultado, errores, fecha) | Completo | Entidad `Intento` + `IntentoService`. |
| RF-14 | Instructor califica aprobado/reprobado | Completo | `CalificarIntentos.jsx` + `EvaluacionController`. |
| RF-15 | Certificaciones con fecha de emisión y vencimiento | Completo | Entidad `Certificacion`, emitida al calificar. |
| RF-16 | Notificar en plataforma certificaciones por vencer/vencidas | **Parcial** | Bien cubierto como *información visible* (badges en `MisCertificados.jsx`, widget "Por vencer (30 días)" en `Dashboard.jsx` y `Reportes.jsx`). Pero el ícono de campana del Navbar es decorativo — no muestra ni un contador ni un dropdown, lo cual se lee como una función rota más que como "no implementada". Recomendado: o quitarlo, o conectarlo a `certificacionesPorVencer()`. |
| RF-17 | Reportes de progreso por empleado/grupo/ejercicio | Completo | `Reportes.jsx` + `ReporteService`, con control de acceso horizontal ya corregido. |

**Resumen**: 13 de 17 RF completos, 4 parciales, 0 sin empezar.

---

## 3. Requisitos no funcionales

| RNF | Categoría | Estado | Nota |
|---|---|---|---|
| RNF-01 | Rendimiento (<1s feedback) | Completo | Simulación server-side es prácticamente instantánea a esta escala. |
| RNF-02 | Web, sin instalación | Completo | SPA React + API REST. |
| RNF-03 | Compatibilidad cross-browser | **Sin verificar** | No hay evidencia de pruebas manuales en Chrome/Edge/Firefox más allá del navegador principal del usuario. |
| RNF-04 | RBAC + autenticación | Completo | JWT + roles reforzados en backend y frontend (incluyendo la vulnerabilidad de escalación horizontal corregida esta sesión). |
| RNF-05 | Escalar a ~50 usuarios | Completo | Índices de FK agregados; arquitectura simple y adecuada a esa escala. |
| RNF-06 | Usabilidad para no-expertos | Completo (en progreso de pulido) | Tema oscuro consistente; esta sesión se corrigieron cortes de layout y se agregó ocultar/mostrar sidebar. |
| RNF-07 | Disponibilidad en horario laboral | N/A en desarrollo | Depende de dónde se despliegue finalmente; no aplica mientras corre local. |
| RNF-08 | Arquitectura modular/mantenible | Completo | Separación clara de `service`/`controller`/`simulacion`. |
| — | **Pruebas automatizadas** | **Falta por completo** | `src/test` está vacío tanto en backend como frontend. No es un RF/RNF explícito del documento original, pero es el hueco de calidad más grande del proyecto tal como está hoy. |

---

## 4. Plan de acción priorizado

### Prioridad alta (bloquea funcionalidad o da apariencia de bug)

1. **Ejecutar la migración SQL pendiente** de la sesión anterior (conversión de las 8 columnas `oid`→`text` por el bug de Hibernate/PostgreSQL "Unable to access lob stream"). El código Java ya está corregido, pero sin la migración el error puede seguir apareciendo en producción/datos existentes.
2. **Botón "Eliminar ejercicio"** en `GestionInstruccion.jsx` — el backend ya lo soporta, es solo exponerlo en la tabla (con confirmación, ya que borra en cascada las asignaciones/intentos asociados si existieran).
3. **Confirmar visualmente** que el toggle de sidebar y el fin del scroll horizontal (cambios de esta sesión) se ven bien en el navegador real del usuario — pendiente de tu confirmación.
4. **Resolver el ícono de campana del Navbar**: conectarlo a `certificacionesPorVencer()` (contador + dropdown simple) o quitarlo hasta que se implemente, para que no parezca una función rota.

### Prioridad media (completa un RF parcial)

5. **CRUD de grupos** en el frontend (crear/renombrar/eliminar), reutilizando los endpoints ya existentes de `GrupoController`. Encaja bien como una sección nueva dentro de `AdminUsuarios.jsx`.
6. **Debounce opcional** en el editor de código para disparar `validar()` automáticamente unos cientos de ms después de dejar de escribir, acercando RF-11 a "tiempo real" sin sobrecargar el backend con cada tecla.

### Prioridad baja (calidad/robustez, no bloquea la presentación)

7. **Pruebas automatizadas mínimas**: al menos unit tests de `IsoInterpreterService` (parser G/M) y `ValidacionService` en backend, y un smoke test de login + validación de código en frontend. Es el hueco más grande de calidad del proyecto.
8. **Verificación manual cross-browser** (Chrome/Edge/Firefox) para cerrar RNF-03 formalmente.
9. Decidir si "eliminar usuario" debe ser borrado físico además del soft-delete actual (hoy solo desactiva) — probablemente no haga falta, pero conviene dejarlo explícito.

---

## 5. Para la presentación de hoy

Si el objetivo es mostrar un avance funcional, el sistema ya cubre el flujo completo (login → asignación → editor/validador → simulación 2D con plano de referencia → envío de intento → calificación → certificación con vencimiento → reportes), con control de acceso por rol correctamente aplicado. Los puntos 1 y 3 de la lista de prioridad alta son los únicos que podrían notarse en una demo en vivo si no se resuelven antes; el resto son mejoras incrementales que no comprometen lo ya mostrado.
