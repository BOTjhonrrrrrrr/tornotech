# TornoTech LMS — Diseño del nuevo motor de simulación CNC

Fecha: 2026-08-14
Basado en la evaluación de las 6 aplicaciones de referencia proporcionadas por el usuario (proyecto1 a proyecto6). `proyecto4.zip` y `proyecto5.zip` fueron extraídos manualmente por el usuario en `referencias/` y ya están incluidos en esta evaluación.

## 1. Evaluación comparativa de referencias

| Proyecto | Stack | Máquina | Interpolación circular | Ciclos enlatados | Remoción de material | Validación / diagnóstico | Fortaleza principal |
|---|---|---|---|---|---|---|---|
| proyecto1 (TornoLab) | HTML/JS vanilla | Torno (G18 X/Z) | G02/G03 completo, notación R **y** I/K, con G90.1/G91.1 para centro absoluto | No | No (solo trayectoria) | Excelente: valida radio inicio≠fin con tolerancia, error por cuerda>radio, mensajes de línea específicos | Geometría de arco robusta y bien acotada — la más portable a Java |
| proyecto2 (TornoFanucSistema) | Python (matplotlib + customtkinter) | Torno | G02/G03 vía R o I/K | G71/G72 (desbaste/acabado) y roscado G21 con perfil triangular real, multi-pasada | Sí — perfil remanente real (`perfil_remanente_x`), la única de las 6 que simula remoción real de material | Seguimiento modal completo (G96/G97/G94/G95/G92) | La más completa conceptualmente; motor de referencia para "qué se puede llegar a construir" |
| proyecto3 (Simulador_CNC_Torno.py) | Python (Tkinter + matplotlib) | Torno | G02/G03, matemática de arco propia (más simple que proyecto1/2) | G73/G72/G28/G54/G92 reconocidos pero como banderas, no ciclos calculados | No | Básica | Incluye programas ISO de ejemplo completos (con G73/G72 reales) útiles como contenido de ejercicios |
| proyecto4 (Trazador G-code 2D, versión "app") | JS ES6 vanilla + Canvas 2D + servidor Node local | Fresa/general (solo plano XY; Z se registra como metadato, sin mecanizar) | G02/G03 con **R e I/J** (`arcCenterFromRadius` con selección de arco menor/mayor por signo de R) | No | No | Sistema de diagnóstico por niveles (info/warning/error) con mensajes específicos y amigables: corte sin spindle, corte sin F, arco sin I/J, coordenada extrema, M30 faltante, punto repetido en exceso, segmento desproporcionado | El mejor patrón de "feedback educativo" — heurísticas simples y claras para errores típicos de alumno |
| proyecto5 (Simulador CNC Virtual 2D, versión "codigos") | JS ES6 vanilla + Canvas 2D + servidor Node local | Fresa/general (solo XY, sin Z) | G02/G03 solo con I/J (sin soporte R) | No | No | Mismo sistema de diagnóstico por niveles que proyecto4, más panel de análisis técnico (conteo de movimientos por tipo, distancia total/de corte, bounding box, área) | Incluye 6 programas G-code de ejemplo listos (`ejemplos/*.gcode`) útiles como casos de prueba/QA |
| proyecto6 (HAFEH) | HTML/JS vanilla (Canvas) | Fresa/general | G02/G03, notación R e I/J | No | No | Validación de encabezado estricta (5 líneas), verificación de límites de la mesa/stock (similar a detección de colisión), consola de logs | Mejor UX de simulación: play/pause/step, zoom/pan, ejemplos precargados |

Nota: proyecto4 y proyecto5 son dos versiones del mismo trabajo académico ("Simulador CNC 2D" para fresado en plano XY, sin torno). Comparten casi línea por línea el motor de interpretación; proyecto4 es la versión con mejor matemática de arco (soporta R además de I/J), proyecto5 es la versión con mejor documentación y ejemplos de prueba. Ninguna de las dos maneja el eje Z como movimiento real ni torno — no aportan nada nuevo a la parte de torno, pero sí aportan el mejor patrón de mensajes de diagnóstico visto en las 6 referencias.

Conclusión de la evaluación: ninguna referencia es directamente portable (distintos lenguajes/stacks), pero cada una aporta una pieza clara: la geometría de arco de **proyecto1** es la más limpia para portar a Java (confirmada independientemente por el mismo enfoque R+I/J en proyecto4/proyecto6); el concepto de perfil remanente de **proyecto2** es el que realmente permite validar "pieza terminada correctamente" en vez de solo "trayectoria dibujada"; los programas de ejemplo de **proyecto3** y **proyecto5** sirven como banco de ejercicios/casos de prueba reales; los controles de animación y verificación de límites de **proyecto6** son el mejor referente de UX y de "detección de colisión" simplificada; y el sistema de diagnóstico por niveles (info/warning/error) de **proyecto4/proyecto5** es el mejor modelo para dar feedback educativo específico línea por línea, más allá de solo aceptar/rechazar el intento.

## 2. Alcance propuesto para el nuevo motor (limitado apropiadamente)

Se toma la mejor idea de cada referencia y se recorta a lo que aporta valor pedagógico medible, evitando reconstruir un CAM completo:

**Se incorpora:**
- G02/G03 con notación R e I/K (algoritmo de proyecto1, incluida su validación de radio inicio/fin y elección de arco mayor/menor).
- Perfil remanente de stock simplificado (arreglo `perfilRemanenteX[]` de resolución fija a lo largo de Z), inspirado en proyecto2, pero solo para dos usos: render de "material cortado" y validación de dimensión final — no se modela dureza de material, fuerzas de corte, ni desgaste de herramienta.
- G71 (ciclo de desbaste) como expansión a movimientos G01 equivalentes antes de interpretar, reutilizando el pipeline existente en vez de un motor de ciclos aparte.
- Verificación de límites/colisión estilo proyecto6: cualquier movimiento que corte fuera del stock bruto o "a través" de material ya certificado como removido incorrectamente se marca como colisión.
- Controles de simulación (play/pause/step) en el frontend, inspirados en la UX de proyecto6.
- Diagnóstico por niveles (info/warning/error), inspirado en proyecto4/proyecto5: además de aceptar/rechazar el intento, se listan advertencias específicas y legibles (corte con husillo apagado, corte sin avance F, arco sin I/J/R, coordenada fuera del área de trabajo, programa sin M30) — esto no bloquea el intento pero mejora el feedback pedagógico independientemente del resultado de aprobación automática.

**Se deja fuera de este alcance (backlog explícito):**
- G72/G73 como ciclos completamente calculados (proyecto2 los tiene; se puede añadir en una segunda fase reutilizando el mismo patrón de expansión que G71).
- Roscado (G21/ciclos de rosca) — alta complejidad geométrica para el valor pedagógico actual.
- Fresado 2.5D/3D (proyecto6 es de fresa/general; TornoTech ya definió el alcance en torno + fresado básico existente, no se amplía por ahora).

## 3. Cambios de backend

`IsoInterpreterService.java`:
1. Soporte real de G02/G03 (R e I/K), con los mismos mensajes de error que proyecto1 (radio inconsistente, cuerda mayor al radio, centro faltante).
2. Mantenimiento de `perfilRemanenteX[]` durante la interpretación: cada movimiento de corte (G01/G02/G03 con avance, no G00) reduce el perfil en el rango de Z que atraviesa.
3. Expansión de G71 a pasadas G01 equivalentes antes de interpretar.
4. Chequeo de colisión: movimiento que requiere cortar donde `perfilRemanenteX` ya es menor al radio objetivo del movimiento (material ya removido / hueco) → colisión; movimiento que excede el diámetro de stock bruto → colisión.
5. Errores de sintaxis existentes (`CODIGO_NO_SOPORTADO`) se mantienen y se amplían a los nuevos códigos.
6. Lista de advertencias no bloqueantes por línea (nivel `info`/`warning`), con los mismos casos que proyecto4/proyecto5: corte con husillo apagado, corte sin F, arco sin I/J/R, coordenada fuera de rango, punto repetido en exceso, programa sin M30. Se devuelven junto al resultado de `/api/simulacion/ejecutar` para mostrarse en el panel de la izquierda, sin afectar el veredicto de aprobación automática (que depende solo de los 3 criterios confirmados).

Contenido de prueba reutilizable: los 6 archivos `ejemplos/*.gcode` de proyecto5 y los programas ISO completos del setup guide de proyecto3 son útiles como casos de prueba automatizados para `ValidacionService` (programas válidos, con advertencias, con errores geométricos) antes de dar el motor por terminado.

## 4. Método de validación automática de progreso (persistido en BD)

Criterios confirmados por el usuario: sin colisiones ni errores de sintaxis, dimensiones finales dentro de tolerancia, uso correcto de códigos/estrategia esperada.

**Nuevos campos en `Ejercicio`:**
- `perfilObjetivoJson` — lista de puntos `{z, diametro}` que define la geometría final esperada (se puede generar con el mismo `GeneradorPiezaService` ya existente).
- `toleranciaMm` — tolerancia dimensional aceptada (por ejemplo 0.1 mm).
- `codigosRequeridos` / `codigosProhibidos` — listas de códigos ISO (p. ej. requerir `G02`/`G03` en un ejercicio de interpolación circular, prohibir `G00` durante el corte).
- `estrategiaEsperada` — enum (`PUNTO_A_PUNTO`, `INTERPOLACION_CIRCULAR`, `CICLO_DESBASTE`).

**Nuevos campos en `Intento`:**
- `resultadoAutomatico` — enum `APROBADO` / `RECHAZADO` / `PENDIENTE_REVISION`.
- `detalleValidacionJson` — resultado por criterio: colisión (bool), errores de sintaxis (lista), desviación máxima en mm, códigos usados, cumplimiento de estrategia.

**`ValidacionService` (nuevo), invocado desde `IntentoService` tras cada intento:**
1. Si hay colisión o error de sintaxis → `RECHAZADO` inmediato, sin evaluar el resto.
2. Compara `perfilRemanenteX` final contra `perfilObjetivoJson` en los mismos puntos de Z; si la desviación máxima excede `toleranciaMm` → `RECHAZADO`, con el detalle de en qué zona de Z falló.
3. Verifica `codigosRequeridos`/`codigosProhibidos` y que el patrón de movimientos coincide con `estrategiaEsperada` (p. ej. si se exigía interpolación circular y el intento sólo usó segmentos G01 en una zona que debía ser un arco).
4. Si los tres criterios pasan → `APROBADO`, y se reutiliza la lógica ya existente en `EvaluacionService` que emite la `Certificacion` válida por 12 meses.
5. Si falla por poco (fuera del criterio 2 con margen pequeño, por ejemplo) → `PENDIENTE_REVISION`, visible para el instructor en la pantalla de calificación de intentos ya existente (`/api/evaluaciones/calificar`).

**Frontend (`SimuladorCNC.jsx`):** el panel de resultado ya existente se amplía con una lista de verificación por criterio (✓/✗), reutilizando el mismo estilo de alerta (`AlertTriangle`) ya implementado.

## 5. Siguiente paso sugerido

Las 6 referencias fueron evaluadas. Implementar en este orden: (1) G02/G03 con validación en `IsoInterpreterService`, (2) perfil remanente + chequeo de colisión, (3) campos nuevos en `Ejercicio`/`Intento` + `ValidacionService`, (4) diagnóstico por niveles no bloqueante, (5) UI de checklist de validación. G71 queda como fase posterior.
