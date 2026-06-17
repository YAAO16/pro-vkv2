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
-- TABLA: ventas (MODIFICADA PARA PAGO MIXTO)
-- ============================================
CREATE TABLE ventas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sede_id INT NOT NULL,
    usuario_id INT NOT NULL,
    total DECIMAL(12,2) NOT NULL,
    metodo_pago ENUM('efectivo', 'transferencia', 'mixto') NOT NULL,
    efectivo DECIMAL(12,2) NULL,
    transferencia DECIMAL(12,2) NULL,
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
    precio_original DECIMAL(12,2) NULL,
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

-- ============================================
-- TABLA: gastos
-- ============================================
CREATE TABLE gastos (
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
-- TABLA: permisos
-- ============================================
CREATE TABLE permisos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    modulo VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA: usuario_permisos
-- ============================================
CREATE TABLE usuario_permisos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    permiso_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (permiso_id) REFERENCES permisos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_usuario_permiso (usuario_id, permiso_id)
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

-- 3. INSERTAR CATEGORÍAS
INSERT INTO categorias (id, nombre, descripcion) VALUES
(1, 'Vapes', 'Dispositivos de vapeo'),
(2, 'E-líquidos', 'Líquidos para vapeo'),
(3, 'Resistencias', 'Resistencias y coils'),
(4, 'Accesorios', 'Accesorios para vapeo');

-- 4. INSERTAR PRODUCTOS
INSERT INTO productos (id, sku, nombre, descripcion, categoria_id, precio_costo, precio_venta, stock_minimo, activo) VALUES
(1, 'VAP-001', 'Vaporesso XROS 3', 'Pod system de última generación', 1, 85000, 129900, 5, TRUE),
(2, 'VAP-002', 'OXVA Xlim Pro', 'Pod system con pantalla', 1, 95000, 139900, 5, TRUE),
(3, 'VAP-003', 'Smok Nord 5', 'Kit de vapeo avanzado', 1, 120000, 169900, 5, TRUE),
(4, 'ELQ-001', 'Nasty Juice Mango', 'E-líquido sabor mango 60ml', 2, 25000, 45000, 10, TRUE),
(5, 'ELQ-002', 'Ruthless Grape Drank', 'E-líquido sabor uva 60ml', 2, 28000, 55000, 10, TRUE),
(6, 'RES-001', 'Coil Vaporesso 0.8', 'Resistencia para XROS', 3, 15000, 35000, 15, TRUE),
(7, 'ACC-001', 'Batería 18650', 'Batería recargable', 4, 12000, 25000, 15, TRUE);

-- 5. INSERTAR INVENTARIO INICIAL
INSERT INTO inventario_diario (sede_id, producto_id, fecha, stock_inicio, entradas, salidas, stock_final)
SELECT 1, id, CURDATE(), 20, 0, 0, 20 FROM productos WHERE activo = true;

INSERT INTO inventario_diario (sede_id, producto_id, fecha, stock_inicio, entradas, salidas, stock_final)
SELECT 2, id, CURDATE(), 20, 0, 0, 20 FROM productos WHERE activo = true;

INSERT INTO inventario_diario (sede_id, producto_id, fecha, stock_inicio, entradas, salidas, stock_final)
SELECT 3, id, CURDATE(), 20, 0, 0, 20 FROM productos WHERE activo = true;

-- 6. INSERTAR PERMISOS
INSERT INTO permisos (nombre, descripcion, modulo) VALUES
-- Ventas
('ventas_crear', 'Permite crear ventas', 'ventas'),
('ventas_ver', 'Permite ver ventas', 'ventas'),
('ventas_anular', 'Permite anular ventas', 'ventas'),
('ventas_ajustar_precio', 'Permite ajustar precios en ventas', 'ventas'),

-- Inventario
('inventario_ver', 'Permite ver inventario', 'inventario'),
('inventario_ajustar', 'Permite ajustar stock', 'inventario'),

-- Productos
('productos_ver', 'Permite ver productos', 'productos'),
('productos_crear', 'Permite crear productos', 'productos'),
('productos_editar', 'Permite editar productos', 'productos'),
('productos_eliminar', 'Permite eliminar productos', 'productos'),

-- Gastos
('gastos_crear', 'Permite crear gastos', 'gastos'),
('gastos_ver', 'Permite ver gastos', 'gastos'),
('gastos_editar', 'Permite editar gastos', 'gastos'),
('gastos_eliminar', 'Permite eliminar gastos', 'gastos'),

-- Cierres
('cierres_ver', 'Permite ver cierres', 'cierres'),
('cierres_crear', 'Permite crear cierres', 'cierres'),

-- Observaciones
('observaciones_crear', 'Permite crear observaciones', 'observaciones'),
('observaciones_ver', 'Permite ver observaciones', 'observaciones'),

-- Reportes
('reportes_ver', 'Permite ver reportes', 'reportes'),
('reportes_exportar', 'Permite exportar reportes', 'reportes'),

-- Dashboard
('dashboard_ver', 'Permite ver dashboard', 'dashboard'),

-- Sedes
('sedes_ver', 'Permite ver sedes', 'sedes'),
('sedes_crear', 'Permite crear sedes', 'sedes'),
('sedes_editar', 'Permite editar sedes', 'sedes'),
('sedes_eliminar', 'Permite eliminar sedes', 'sedes'),

-- Usuarios
('usuarios_ver', 'Permite ver usuarios', 'usuarios'),
('usuarios_crear', 'Permite crear usuarios', 'usuarios'),
('usuarios_editar', 'Permite editar usuarios', 'usuarios'),
('usuarios_eliminar', 'Permite eliminar usuarios', 'usuarios'),

-- Sueldos
('sueldos_ver', 'Permite ver sueldos', 'sueldos'),
('sueldos_crear', 'Permite crear sueldos', 'sueldos'),
('sueldos_editar', 'Permite editar sueldos', 'sueldos'),
('sueldos_eliminar', 'Permite eliminar sueldos', 'sueldos'),

-- Historial
('historial_ver', 'Permite ver historial de ajustes', 'historial'),

-- Productos Dañados
('danados_crear', 'Permite registrar productos dañados', 'danados'),
('danados_ver', 'Permite ver productos dañados', 'danados'),
('danados_eliminar', 'Permite eliminar productos dañados', 'danados');

-- 7. ASIGNAR PERMISOS AL ADMINISTRADOR (usuario_id = 1)
INSERT INTO usuario_permisos (usuario_id, permiso_id)
SELECT 1, id FROM permisos
ON DUPLICATE KEY UPDATE permiso_id = permiso_id;

-- 8. ASIGNAR PERMISOS BÁSICOS A VENDEDORES
INSERT INTO usuario_permisos (usuario_id, permiso_id) 
SELECT u.id, p.id
FROM usuarios u
CROSS JOIN permisos p
WHERE u.rol = 'vendedor' 
AND p.nombre IN (
    'ventas_crear',
    'ventas_ver',
    'ventas_ajustar_precio',
    'inventario_ver',
    'productos_ver',
    'gastos_crear',
    'gastos_ver',
    'cierres_ver',
    'cierres_crear',
    'observaciones_crear',
    'observaciones_ver',
    'reportes_ver',
    'dashboard_ver'
)
ON DUPLICATE KEY UPDATE permiso_id = permiso_id;

-- 9. INSERTAR REGISTROS DE PRUEBA - GASTOS (con fechas válidas)
INSERT INTO gastos (fecha, motivo, valor, descripcion, sede_id, usuario_id) VALUES
(CURDATE(), 'Compra de mercancía', 500000, 'Compra de nuevos productos para inventario', 1, 2),
(DATE_SUB(CURDATE(), INTERVAL 1 DAY), 'Pago de servicios públicos', 150000, 'Luz y agua del local', 1, 2),
(DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'Mantenimiento de equipos', 200000, 'Reparación de equipos de vapeo', 2, 3),
(DATE_SUB(CURDATE(), INTERVAL 3 DAY), 'Compra de empaques', 80000, 'Bolsas y cajas para entregas', 3, 4),
(DATE_SUB(CURDATE(), INTERVAL 5 DAY), 'Publicidad y marketing', 300000, 'Redes sociales y volantes', 1, 2),
(DATE_SUB(CURDATE(), INTERVAL 7 DAY), 'Transporte', 120000, 'Envío de mercancía', 2, 3),
(DATE_SUB(CURDATE(), INTERVAL 10 DAY), 'Papelería', 45000, 'Facturas, esferos, etc.', 3, 4),
(DATE_SUB(CURDATE(), INTERVAL 15 DAY), 'Compra de mercancía', 350000, 'Reposición de stock', 1, 2),
(DATE_SUB(CURDATE(), INTERVAL 20 DAY), 'Mantenimiento local', 180000, 'Arreglos en el local', 2, 3),
(DATE_SUB(CURDATE(), INTERVAL 30 DAY), 'Suscripciones software', 120000, 'Mensualidad sistema de ventas', 1, 2);

-- 10. INSERTAR REGISTROS DE PRUEBA - VENTAS MIXTAS
-- Venta 1: Mixta (efectivo + transferencia)
INSERT INTO ventas (sede_id, usuario_id, total, metodo_pago, efectivo, transferencia, created_at, notas) VALUES
(1, 2, 129900, 'mixto', 80000, 49900, NOW(), 'Venta mixta - Vaporesso XROS 3');

INSERT INTO venta_detalle (venta_id, producto_id, cantidad, precio_unit, precio_original, subtotal) VALUES
(LAST_INSERT_ID(), 1, 1, 129900, NULL, 129900);

-- Actualizar inventario para venta 1
INSERT INTO inventario_diario (sede_id, producto_id, fecha, stock_inicio, entradas, salidas, stock_final)
SELECT 1, 1, CURDATE(), 
       (SELECT stock_final FROM inventario_diario WHERE sede_id = 1 AND producto_id = 1 ORDER BY fecha DESC LIMIT 1),
       0, 1, 
       (SELECT stock_final FROM inventario_diario WHERE sede_id = 1 AND producto_id = 1 ORDER BY fecha DESC LIMIT 1) - 1
ON DUPLICATE KEY UPDATE salidas = salidas + 1, stock_final = stock_final - 1;

-- Venta 2: Mixta (efectivo + transferencia) con dos productos
INSERT INTO ventas (sede_id, usuario_id, total, metodo_pago, efectivo, transferencia, created_at, notas) VALUES
(2, 3, 194900, 'mixto', 100000, 94900, NOW(), 'Venta mixta - OXVA Xlim Pro + E-líquido');

INSERT INTO venta_detalle (venta_id, producto_id, cantidad, precio_unit, precio_original, subtotal) VALUES
(LAST_INSERT_ID(), 2, 1, 139900, NULL, 139900),
(LAST_INSERT_ID(), 4, 1, 55000, NULL, 55000);

-- Venta 3: Solo efectivo con ajuste de precio
INSERT INTO ventas (sede_id, usuario_id, total, metodo_pago, efectivo, transferencia, created_at, notas) VALUES
(3, 4, 105000, 'efectivo', 105000, NULL, NOW(), 'Venta con descuento especial');

INSERT INTO venta_detalle (venta_id, producto_id, cantidad, precio_unit, precio_original, subtotal) VALUES
(LAST_INSERT_ID(), 3, 1, 105000, 169900, 105000);

-- Venta 4: Solo transferencia
INSERT INTO ventas (sede_id, usuario_id, total, metodo_pago, efectivo, transferencia, created_at, notas) VALUES
(1, 2, 80000, 'transferencia', NULL, 80000, NOW(), 'Venta por transferencia - Resistencias');

INSERT INTO venta_detalle (venta_id, producto_id, cantidad, precio_unit, precio_original, subtotal) VALUES
(LAST_INSERT_ID(), 6, 2, 40000, 35000, 80000);
