-- ============================================
-- ELIMINAR BASE DE DATOS (No recomendado directamente en la nube si ya estás conectado a ella)
-- En Postgres en la nube, simplemente borras las tablas si existen
-- ============================================
DROP TABLE IF EXISTS sueldos_vendedores CASCADE;
DROP TABLE IF EXISTS productos_danados CASCADE;
DROP TABLE IF EXISTS observaciones CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS transferencias CASCADE;
DROP TABLE IF EXISTS cierres_diarios CASCADE;
DROP TABLE IF EXISTS inventario_diario CASCADE;
DROP TABLE IF EXISTS venta_detalle CASCADE;
DROP TABLE IF EXISTS ventas CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS sedes CASCADE;

-- Eliminar ENUMs si ya existen para evitar errores de duplicado
DROP TYPE IF EXISTS tipo_rol;
DROP TYPE IF EXISTS tipo_pago;
DROP TYPE IF EXISTS tipo_estado_transferencia;
DROP TYPE IF EXISTS tipo_estado_sueldo;

-- ============================================
-- CREACIÓN DE TIPOS ENUM (Postgres usa CREATE TYPE)
-- ============================================
CREATE TYPE tipo_rol AS ENUM ('admin', 'vendedor');
CREATE TYPE tipo_pago AS ENUM ('efectivo', 'transferencia');
CREATE TYPE tipo_estado_transferencia AS ENUM ('pendiente', 'aprobado', 'rechazado');
CREATE TYPE tipo_estado_sueldo AS ENUM ('pendiente', 'pagado', 'anulado');

-- ============================================
-- TABLA: sedes
-- ============================================
CREATE TABLE sedes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    direccion VARCHAR(255),
    telefono VARCHAR(20),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA: usuarios
-- ============================================
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol tipo_rol NOT NULL,
    sede_id INT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sede_id) REFERENCES sedes(id) ON DELETE SET NULL
);

CREATE INDEX idx_username ON usuarios (username);
CREATE INDEX idx_rol ON usuarios (rol);

-- ============================================
-- TABLA: categorias
-- ============================================
CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    padre_id INT,
    FOREIGN KEY (padre_id) REFERENCES categorias(id) ON DELETE SET NULL
);

-- ============================================
-- TABLA: productos
-- ============================================
CREATE TABLE productos (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    categoria_id INT,
    precio_costo DECIMAL(12,2) NOT NULL,
    precio_venta DECIMAL(12,2) NOT NULL,
    stock_minimo INT DEFAULT 5,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL
);

CREATE INDEX idx_sku ON productos (sku);
CREATE INDEX idx_nombre ON productos (nombre);

-- ============================================
-- TABLA: ventas
-- ============================================
CREATE TABLE ventas (
    id SERIAL PRIMARY KEY,
    sede_id INT NOT NULL,
    usuario_id INT NOT NULL,
    total DECIMAL(12,2) NOT NULL,
    metodo_pago tipo_pago NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notas TEXT,
    anulada BOOLEAN DEFAULT FALSE,
    anulada_por INT,
    motivo_anulacion TEXT,
    FOREIGN KEY (sede_id) REFERENCES sedes(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (anulada_por) REFERENCES usuarios(id)
);

CREATE INDEX idx_sede_fecha ON ventas (sede_id, created_at);
CREATE INDEX idx_fecha_ventas ON ventas (created_at);

-- ============================================
-- TABLA: venta_detalle
-- ============================================
CREATE TABLE venta_detalle (
    id SERIAL PRIMARY KEY,
    venta_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unit DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
);

CREATE INDEX idx_venta ON venta_detalle (venta_id);
CREATE INDEX idx_producto_detalle ON venta_detalle (producto_id);

-- ============================================
-- TABLA: inventario_diario
-- ============================================
CREATE TABLE inventario_diario (
    id SERIAL PRIMARY KEY,
    sede_id INT NOT NULL,
    producto_id INT NOT NULL,
    fecha DATE NOT NULL,
    stock_inicio INT NOT NULL,
    entradas INT DEFAULT 0,
    salidas INT DEFAULT 0,
    stock_final INT NOT NULL,
    FOREIGN KEY (sede_id) REFERENCES sedes(id),
    FOREIGN KEY (producto_id) REFERENCES productos(id),
    CONSTRAINT uq_inventario_sede_fecha_producto UNIQUE (sede_id, fecha, producto_id)
);

CREATE INDEX idx_sede_fecha_inv ON inventario_diario (sede_id, fecha);
CREATE INDEX idx_producto_inv ON inventario_diario (producto_id);

-- ============================================
-- TABLA: cierres_diarios
-- ============================================
CREATE TABLE cierres_diarios (
    id SERIAL PRIMARY KEY,
    sede_id INT NOT NULL,
    fecha DATE NOT NULL,
    balance_sistema DECIMAL(12,2) NOT NULL,
    efectivo_reportado DECIMAL(12,2) NOT NULL,
    transferencia_reportada DECIMAL(12,2) NOT NULL,
    diferencia DECIMAL(12,2) NOT NULL,
    cerrado_por INT,
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sede_id) REFERENCES sedes(id),
    FOREIGN KEY (cerrado_por) REFERENCES usuarios(id),
    CONSTRAINT uq_cierre_sede_fecha UNIQUE (sede_id, fecha)
);

CREATE INDEX idx_fecha_cierres ON cierres_diarios (fecha);

-- ============================================
-- TABLA: transferencias
-- ============================================
CREATE TABLE transferencias (
    id SERIAL PRIMARY KEY,
    sede_origen INT NOT NULL,
    sede_destino INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL,
    solicitado_por INT,
    approved_por INT, -- Cambiado aprobado_por a approved_por para evitar conflictos si aplica
    estado tipo_estado_transferencia DEFAULT 'pendiente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sede_origen) REFERENCES sedes(id),
    FOREIGN KEY (sede_destino) REFERENCES sedes(id),
    FOREIGN KEY (producto_id) REFERENCES productos(id),
    FOREIGN KEY (solicitado_por) REFERENCES usuarios(id),
    FOREIGN KEY (approved_por) REFERENCES usuarios(id)
);

CREATE INDEX idx_estado_transf ON transferencias (estado);
CREATE INDEX idx_origen_transf ON transferencias (sede_origen);
CREATE INDEX idx_destino_transf ON transferencias (sede_destino);

-- ============================================
-- TABLA: audit_log
-- ============================================
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    usuario_id INT,
    accion VARCHAR(100) NOT NULL,
    tabla VARCHAR(100) NOT NULL,
    registro_id INT,
    detalle JSONB, -- JSONB es más eficiente en PostgreSQL que JSON plano
    ip VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX idx_usuario_audit ON audit_log (usuario_id);
CREATE INDEX idx_fecha_audit ON audit_log (created_at);
CREATE INDEX idx_tabla_audit ON audit_log (tabla);

-- ============================================
-- TABLA: observaciones
-- ============================================
CREATE TABLE observaciones (
    id SERIAL PRIMARY KEY,
    sede_id INT NOT NULL,
    usuario_id INT NOT NULL,
    observacion TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sede_obs ON observaciones (sede_id);
CREATE INDEX idx_fecha_obs ON observaciones (created_at);

-- Crear una función para auto-actualizar el campo updated_at (Postgres no tiene ON UPDATE nativo)
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_observaciones_modtime
    BEFORE UPDATE ON observaciones
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- ============================================
-- TABLA: productos_danados
-- ============================================
CREATE TABLE productos_danados (
    id SERIAL PRIMARY KEY,
    sede_id INT NOT NULL,
    usuario_id INT NOT NULL,
    fecha DATE NOT NULL,
    nombre_producto VARCHAR(200) NOT NULL,
    cantidad INT NOT NULL,
    motivo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sede_id) REFERENCES sedes(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE INDEX idx_sede_danados ON productos_danados (sede_id);
CREATE INDEX idx_fecha_danados ON productos_danados (fecha);

CREATE TRIGGER update_productos_danados_modtime
    BEFORE UPDATE ON productos_danados
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- ============================================
-- TABLA: sueldos_vendedores
-- ============================================
CREATE TABLE sueldos_vendedores (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL,
    sede_id INT NOT NULL,
    mes INT NOT NULL,
    ano INT NOT NULL,
    sueldo_base DECIMAL(12,2) NOT NULL,
    comisiones DECIMAL(12,2) DEFAULT 0.00,
    bonificaciones DECIMAL(12,2) DEFAULT 0.00,
    deducciones DECIMAL(12,2) DEFAULT 0.00,
    total DECIMAL(12,2) NOT NULL,
    estado tipo_estado_sueldo DEFAULT 'pendiente',
    fecha_pago DATE,
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (sede_id) REFERENCES sedes(id),
    CONSTRAINT uq_sueldo_mes_ano UNIQUE (usuario_id, mes, ano)
);

CREATE INDEX idx_sede_sueldos ON sueldos_vendedores (sede_id);
CREATE INDEX idx_estado_sueldos ON sueldos_vendedores (estado);
CREATE INDEX idx_fecha_sueldos ON sueldos_vendedores (mes, ano);

CREATE TRIGGER update_sueldos_modtime
    BEFORE UPDATE ON sueldos_vendedores
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();


-- ============================================
-- DATOS DE PRUEBA (Mantenemos los IDs explícitos)
-- ============================================

-- 1. INSERTAR SEDES
INSERT INTO sedes (id, nombre, ciudad, direccion, telefono, activo) VALUES
(1, 'Villagarzón', 'Villagarzón', 'Calle Principal #123 - Barrio Centro', '3111234567', TRUE),
(2, 'Mocoa', 'Mocoa', 'Carrera 8 #15-20 - Centro Comercial La 8', '3112345678', TRUE),
(3, 'Puerto Asís', 'Puerto Asís', 'Avenida Colombia #45 - Barrio Santander', '3113456789', TRUE);

-- Ajustar la secuencia del autoincremental de sedes debido a la inserción forzada de IDs
SELECT setval('sedes_id_seq', (SELECT MAX(id) FROM sedes));

-- 2. INSERTAR USUARIOS
INSERT INTO usuarios (id, username, nombre_completo, password_hash, rol, sede_id, activo) VALUES
(1, 'Eduar_admin', 'Eduar Administrador', '$2b$12$/Ke865n3rVnkpxM2CD4zDu82RjOqrzsAspDdKQbIAH.DPUOOeaVay', 'admin', NULL, TRUE),
(2, 'villavp', 'Vendedor Villagarzón', '$2b$12$I3SiWin21MNFERfF84ly.OxO2A/sZyrkD17gpxWzrsXl.AUrkpzOm', 'vendedor', 1, TRUE),
(3, 'mocoavp', 'Vendedor Mocoa', '$2b$12$cN3R/PxYh8oajBryexfzYuwUmacwGMW/zARXtx0MU/e68NZVPe7Fu', 'vendedor', 2, TRUE),
(4, 'puertoasisp', 'Vendedor Puerto Asís', '$2b$12$QzJhH0vSLhxoAcnNwb4r2.El9rw0ch9JW2B7izPIr0oqxChJKF68e', 'vendedor', 3, TRUE);

-- Ajustar la secuencia del autoincremental de usuarios debido a la inserción forzada de IDs
SELECT setval('usuarios_id_seq', (SELECT MAX(id) FROM usuarios));