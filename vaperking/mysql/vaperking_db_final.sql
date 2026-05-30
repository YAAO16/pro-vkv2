-- ============================================
-- ELIMINAR BASE DE DATOS SI EXISTE
-- ============================================
DROP DATABASE IF EXISTS vaperking_db;

-- ============================================
-- CREAR BASE DE DATOS
-- ============================================
CREATE DATABASE vaperking_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE vaperking_db;

-- ============================================
-- TABLA: sedes
-- ============================================
CREATE TABLE sedes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    direccion VARCHAR(255),
    telefono VARCHAR(20),
    activo BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA: usuarios
-- ============================================
CREATE TABLE usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol ENUM('admin', 'vendedor') NOT NULL,
    sede_id INT,
    activo BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sede_id) REFERENCES sedes(id) ON DELETE SET NULL,
    INDEX idx_username (username),
    INDEX idx_rol (rol)
);

-- ============================================
-- TABLA: categorias
-- ============================================
CREATE TABLE categorias (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    padre_id INT,
    FOREIGN KEY (padre_id) REFERENCES categorias(id) ON DELETE SET NULL
);

-- ============================================
-- TABLA: productos
-- ============================================
CREATE TABLE productos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sku VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    categoria_id INT,
    precio_costo DECIMAL(12,2) NOT NULL,
    precio_venta DECIMAL(12,2) NOT NULL,
    stock_minimo INT DEFAULT 5,
    activo BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL,
    INDEX idx_sku (sku),
    INDEX idx_nombre (nombre)
);

-- ============================================
-- TABLA: ventas
-- ============================================
CREATE TABLE ventas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sede_id INT NOT NULL,
    usuario_id INT NOT NULL,
    total DECIMAL(12,2) NOT NULL,
    metodo_pago ENUM('efectivo', 'transferencia') NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    notas TEXT,
    anulada BOOLEAN DEFAULT FALSE,
    anulada_por INT,
    motivo_anulacion TEXT,
    FOREIGN KEY (sede_id) REFERENCES sedes(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (anulada_por) REFERENCES usuarios(id),
    INDEX idx_sede_fecha (sede_id, created_at),
    INDEX idx_fecha (created_at)
);

-- ============================================
-- TABLA: venta_detalle
-- ============================================
CREATE TABLE venta_detalle (
    id INT PRIMARY KEY AUTO_INCREMENT,
    venta_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unit DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id),
    INDEX idx_venta (venta_id),
    INDEX idx_producto (producto_id)
);

-- ============================================
-- TABLA: inventario_diario
-- ============================================
CREATE TABLE inventario_diario (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sede_id INT NOT NULL,
    producto_id INT NOT NULL,
    fecha DATE NOT NULL,
    stock_inicio INT NOT NULL,
    entradas INT DEFAULT 0,
    salidas INT DEFAULT 0,
    stock_final INT NOT NULL,
    FOREIGN KEY (sede_id) REFERENCES sedes(id),
    FOREIGN KEY (producto_id) REFERENCES productos(id),
    UNIQUE KEY uq_inventario_sede_fecha_producto (sede_id, fecha, producto_id),
    INDEX idx_sede_fecha (sede_id, fecha),
    INDEX idx_producto (producto_id)
);

-- ============================================
-- TABLA: cierres_diarios
-- ============================================
CREATE TABLE cierres_diarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sede_id INT NOT NULL,
    fecha DATE NOT NULL,
    balance_sistema DECIMAL(12,2) NOT NULL,
    efectivo_reportado DECIMAL(12,2) NOT NULL,
    transferencia_reportada DECIMAL(12,2) NOT NULL,
    diferencia DECIMAL(12,2) NOT NULL,
    cerrado_por INT,
    observaciones TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sede_id) REFERENCES sedes(id),
    FOREIGN KEY (cerrado_por) REFERENCES usuarios(id),
    UNIQUE KEY uq_cierre_sede_fecha (sede_id, fecha),
    INDEX idx_fecha (fecha)
);

-- ============================================
-- TABLA: transferencias
-- ============================================
CREATE TABLE transferencias (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sede_origen INT NOT NULL,
    sede_destino INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL,
    solicitado_por INT,
    aprobado_por INT,
    estado ENUM('pendiente', 'aprobado', 'rechazado') DEFAULT 'pendiente',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sede_origen) REFERENCES sedes(id),
    FOREIGN KEY (sede_destino) REFERENCES sedes(id),
    FOREIGN KEY (producto_id) REFERENCES productos(id),
    FOREIGN KEY (solicitado_por) REFERENCES usuarios(id),
    FOREIGN KEY (aprobado_por) REFERENCES usuarios(id),
    INDEX idx_estado (estado),
    INDEX idx_origen (sede_origen),
    INDEX idx_destino (sede_destino)
);

-- ============================================
-- TABLA: audit_log
-- ============================================
CREATE TABLE audit_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT,
    accion VARCHAR(100) NOT NULL,
    tabla VARCHAR(100) NOT NULL,
    registro_id INT,
    detalle JSON,
    ip VARCHAR(45),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_usuario (usuario_id),
    INDEX idx_fecha (created_at),
    INDEX idx_tabla (tabla)
);

-- ============================================
-- TABLA: observaciones
-- ============================================
CREATE TABLE observaciones (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sede_id INT NOT NULL,
    usuario_id INT NOT NULL,
    observacion TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sede_id) REFERENCES sedes(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    INDEX idx_sede (sede_id),
    INDEX idx_fecha (created_at)
);

-- ============================================
-- TABLA: productos_danados
-- ============================================
CREATE TABLE productos_danados (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sede_id INT NOT NULL,
    usuario_id INT NOT NULL,
    fecha DATE NOT NULL,
    nombre_producto VARCHAR(200) NOT NULL,
    cantidad INT NOT NULL,
    motivo TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sede_id) REFERENCES sedes(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    INDEX idx_sede (sede_id),
    INDEX idx_fecha (fecha)
);

-- ============================================
-- TABLA: sueldos_vendedores
-- ============================================
CREATE TABLE sueldos_vendedores (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    sede_id INT NOT NULL,
    mes INT NOT NULL,
    ano INT NOT NULL,
    sueldo_base DECIMAL(12,2) NOT NULL,
    comisiones DECIMAL(12,2) DEFAULT 0.00,
    bonificaciones DECIMAL(12,2) DEFAULT 0.00,
    deducciones DECIMAL(12,2) DEFAULT 0.00,
    total DECIMAL(12,2) NOT NULL,
    estado ENUM('pendiente', 'pagado', 'anulado') DEFAULT 'pendiente',
    fecha_pago DATE,
    observaciones TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (sede_id) REFERENCES sedes(id),
    UNIQUE KEY uq_sueldo_mes_ano (usuario_id, mes, ano),
    INDEX idx_sede (sede_id),
    INDEX idx_estado (estado),
    INDEX idx_fecha (mes, ano)
);

-- Tabla de gastos
CREATE TABLE IF NOT EXISTS gastos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    fecha DATE NOT NULL,
    motivo VARCHAR(255) NOT NULL,
    valor DECIMAL(12,2) NOT NULL,
    descripcion TEXT,
    sede_id INT NOT NULL,
    usuario_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sede_id) REFERENCES sedes(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    INDEX idx_fecha (fecha),
    INDEX idx_sede (sede_id)
);
-- ============================================
-- DATOS DE PRUEBA
-- ============================================

-- 1. INSERTAR SEDES
INSERT INTO sedes (id, nombre, ciudad, direccion, telefono, activo) VALUES
(1, 'Villagarzón', 'Villagarzón', 'Calle Principal #123 - Barrio Centro', '3111234567', TRUE),
(2, 'Mocoa', 'Mocoa', 'Carrera 8 #15-20 - Centro Comercial La 8', '3112345678', TRUE),
(3, 'Puerto Asís', 'Puerto Asís', 'Avenida Colombia #45 - Barrio Santander', '3113456789', TRUE);

-- 2. INSERTAR USUARIOS
-- Contraseñas:
-- Eduar_admin: Edu@rvp2026#
-- villavp: VGZ2025#
-- mocoavp: MOC2025#
-- puertoasisp: PAS2025#
INSERT INTO usuarios (id, username, nombre_completo, password_hash, rol, sede_id, activo) VALUES
(1, 'Eduar_admin', 'Eduar Administrador', '$2b$12$/Ke865n3rVnkpxM2CD4zDu82RjOqrzsAspDdKQbIAH.DPUOOeaVay', 'admin', NULL, TRUE),
(2, 'villavp', 'Vendedor Villagarzón', '$2b$12$I3SiWin21MNFERfF84ly.OxO2A/sZyrkD17gpxWzrsXl.AUrkpzOm', 'vendedor', 1, TRUE),
(3, 'mocoavp', 'Vendedor Mocoa', '$2b$12$cN3R/PxYh8oajBryexfzYuwUmacwGMW/zARXtx0MU/e68NZVPe7Fu', 'vendedor', 2, TRUE),
(4, 'puertoasisp', 'Vendedor Puerto Asís', '$2b$12$QzJhH0vSLhxoAcnNwb4r2.El9rw0ch9JW2B7izPIr0oqxChJKF68e', 'vendedor', 3, TRUE);

