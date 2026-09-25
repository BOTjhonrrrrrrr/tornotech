-- =====================================================================
-- TornoTech LMS - Schema PostgreSQL
-- Corresponde al modelo ER de la seccion 8 del documento de requisitos
-- y a las entidades JPA en src/main/java/com/tornotech/lms/model.
--
-- Uso:
--   - Para arrancar rapido en desarrollo, Hibernate ya crea estas tablas
--     solo con spring.jpa.hibernate.ddl-auto=update (ver application.properties).
--   - Este script es la referencia versionada del schema y la base para
--     migrar a Flyway (db/migration/V1__init.sql) cuando el equipo lo decida.
-- =====================================================================

CREATE TABLE IF NOT EXISTS grupo (
    id          BIGSERIAL PRIMARY KEY,
    nombre      VARCHAR(150) NOT NULL
);

CREATE TABLE IF NOT EXISTS usuario (
    id              BIGSERIAL PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    rol             VARCHAR(20)  NOT NULL CHECK (rol IN ('ADMINISTRADOR', 'INSTRUCTOR', 'APRENDIZ', 'OBSERVADOR')),
    grupo_id        BIGINT REFERENCES grupo(id) ON DELETE SET NULL,
    activo          BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS pieza (
    id                          BIGSERIAL PRIMARY KEY,
    geometria_base              VARCHAR(100) NOT NULL,
    dimensiones                 VARCHAR(255) NOT NULL,
    maquina                     VARCHAR(20)  NOT NULL CHECK (maquina IN ('TORNO_CNC', 'FRESADORA_CNC')),
    parametros_generacion       TEXT, -- JSON
    generada_automaticamente    BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS ejercicio (
    id              BIGSERIAL PRIMARY KEY,
    titulo          VARCHAR(200) NOT NULL,
    maquina         VARCHAR(20)  NOT NULL CHECK (maquina IN ('TORNO_CNC', 'FRESADORA_CNC')),
    dificultad      VARCHAR(20)  NOT NULL CHECK (dificultad IN ('BASICO', 'INTERMEDIO', 'AVANZADO')),
    pieza_id        BIGINT NOT NULL REFERENCES pieza(id),
    instructor_id   BIGINT NOT NULL REFERENCES usuario(id),
    descripcion     TEXT
);

CREATE TABLE IF NOT EXISTS asignacion (
    id                  BIGSERIAL PRIMARY KEY,
    ejercicio_id        BIGINT NOT NULL REFERENCES ejercicio(id) ON DELETE CASCADE,
    usuario_id          BIGINT REFERENCES usuario(id) ON DELETE CASCADE,
    grupo_id            BIGINT REFERENCES grupo(id) ON DELETE CASCADE,
    fecha_asignacion    DATE NOT NULL DEFAULT CURRENT_DATE,
    CONSTRAINT chk_asignacion_destino CHECK (usuario_id IS NOT NULL OR grupo_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS intento (
    id              BIGSERIAL PRIMARY KEY,
    usuario_id      BIGINT NOT NULL REFERENCES usuario(id),
    ejercicio_id    BIGINT NOT NULL REFERENCES ejercicio(id),
    codigo_iso      TEXT NOT NULL,
    fecha_envio     TIMESTAMP NOT NULL DEFAULT NOW(),
    errores         TEXT -- JSON con lista de ErrorPrograma (sintaxis/colision)
);

CREATE TABLE IF NOT EXISTS resultado_simulacion (
    id                          BIGSERIAL PRIMARY KEY,
    intento_id                  BIGINT NOT NULL UNIQUE REFERENCES intento(id) ON DELETE CASCADE,
    trayectoria_2d               TEXT, -- JSON con la lista de segmentos
    colision_detectada          BOOLEAN NOT NULL DEFAULT FALSE,
    tiempo_simulado_segundos    DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS evaluacion (
    id                  BIGSERIAL PRIMARY KEY,
    intento_id          BIGINT NOT NULL UNIQUE REFERENCES intento(id) ON DELETE CASCADE,
    calificado_por      BIGINT NOT NULL REFERENCES usuario(id),
    estado              VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'APROBADO', 'REPROBADO')),
    fecha               DATE NOT NULL DEFAULT CURRENT_DATE,
    comentarios         TEXT
);

CREATE TABLE IF NOT EXISTS certificacion (
    id                  BIGSERIAL PRIMARY KEY,
    usuario_id          BIGINT NOT NULL REFERENCES usuario(id),
    evaluacion_id        BIGINT NOT NULL UNIQUE REFERENCES evaluacion(id),
    fecha_emision       DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_vencimiento   DATE NOT NULL,
    estado              VARCHAR(20) NOT NULL DEFAULT 'VIGENTE' CHECK (estado IN ('VIGENTE', 'POR_VENCER', 'VENCIDA'))
);

-- Indices para las consultas mas frecuentes (reportes y pantalla del simulador)
CREATE INDEX IF NOT EXISTS idx_intento_usuario ON intento(usuario_id);
CREATE INDEX IF NOT EXISTS idx_intento_ejercicio ON intento(ejercicio_id);
CREATE INDEX IF NOT EXISTS idx_asignacion_usuario ON asignacion(usuario_id);
CREATE INDEX IF NOT EXISTS idx_asignacion_grupo ON asignacion(grupo_id);
CREATE INDEX IF NOT EXISTS idx_certificacion_usuario ON certificacion(usuario_id);
CREATE INDEX IF NOT EXISTS idx_certificacion_vencimiento ON certificacion(fecha_vencimiento);
