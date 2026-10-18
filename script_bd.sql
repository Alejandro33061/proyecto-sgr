-- Script de Base de Datos para Sistema Municipal "Muni La Serena" (SGR)
CREATE DATABASE IF NOT EXISTS `sgr_laserena` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `sgr_laserena`;

-- 1. TABLA DELEGACIONES
CREATE TABLE IF NOT EXISTS `delegaciones` (
  `id_delegacion` INT AUTO_INCREMENT PRIMARY KEY,
  `codigo` VARCHAR(20) NOT NULL,
  `nombre` VARCHAR(100) NOT NULL,
  `direccion` VARCHAR(150),
  `comuna` VARCHAR(50) DEFAULT 'La Serena',
  `estado` VARCHAR(20) DEFAULT 'ACTIVO'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. TABLA ROLES
CREATE TABLE IF NOT EXISTS `roles` (
  `id_rol` INT AUTO_INCREMENT PRIMARY KEY,
  `nombre` VARCHAR(50) NOT NULL,
  `descripcion` TEXT,
  `permisos` TEXT,
  `alcance` VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. TABLA USUARIOS
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id_usuario` INT AUTO_INCREMENT PRIMARY KEY,
  `rut` VARCHAR(12),
  `nombre_usuario` VARCHAR(50) NOT NULL,
  `nombre` VARCHAR(100) NOT NULL,
  `correo` VARCHAR(100) NOT NULL UNIQUE,
  `clave` VARCHAR(255) NOT NULL,
  `rol` VARCHAR(50) NOT NULL,
  `delegacion` VARCHAR(100) NOT NULL,
  `estado` VARCHAR(20) DEFAULT 'ACTIVO'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. TABLA ÍTEMS Y METAS
CREATE TABLE IF NOT EXISTS `items_metas` (
  `id_item` INT AUTO_INCREMENT PRIMARY KEY,
  `codigo` VARCHAR(20) NOT NULL,
  `nombre` VARCHAR(100) NOT NULL,
  `descripcion` TEXT,
  `estado` VARCHAR(20) DEFAULT 'Vigente'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. TABLA TIPOS DE ATENCIÓN
CREATE TABLE IF NOT EXISTS `tipos_atencion` (
  `id_tipo` INT AUTO_INCREMENT PRIMARY KEY,
  `codigo` VARCHAR(20) NOT NULL,
  `nombre` VARCHAR(100) NOT NULL,
  `descripcion` TEXT,
  `estado` VARCHAR(20) DEFAULT 'ACTIVO'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. TABLA SUB ATENCIONES
CREATE TABLE IF NOT EXISTS `sub_atenciones` (
  `id_sub` INT AUTO_INCREMENT PRIMARY KEY,
  `codigo` VARCHAR(20) NOT NULL,
  `nombre` VARCHAR(100) NOT NULL,
  `tipo_asociado` VARCHAR(100) NOT NULL,
  `estado` VARCHAR(20) DEFAULT 'ACTIVO'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. TABLA ATENCIONES (ACTUALIZADA CON CAMPO RUT)
CREATE TABLE IF NOT EXISTS `atenciones` (
  `id_atencion` INT AUTO_INCREMENT PRIMARY KEY,
  `rut` VARCHAR(12) NOT NULL,
  `solicitante` VARCHAR(100) NOT NULL,
  `fecha_registro` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `delegacion` VARCHAR(100) NOT NULL,
  `usuario_responsable` VARCHAR(100) NOT NULL,
  `tipo_atencion` VARCHAR(100) NOT NULL,
  `sub_atencion` VARCHAR(100) NOT NULL,
  `descripcion` TEXT,
  `estado` VARCHAR(20) DEFAULT 'PENDIENTE'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================================
-- INSERCIÓN DE DATOS INICIALES
-- ========================================================

INSERT IGNORE INTO `delegaciones` (`id_delegacion`, `codigo`, `nombre`, `direccion`, `comuna`, `estado`) VALUES
(1, 'DEL-001', 'Sector Centro', 'Prat 451', 'La Serena', 'ACTIVO'),
(2, 'DEL-002', 'Las Compañías', 'Esmeralda 1805', 'La Serena', 'ACTIVO'),
(3, 'DEL-003', 'La Pampa', 'Larraín Alcalde 3500', 'La Serena', 'ACTIVO'),
(4, 'DEL-004', 'La Antena / La Florida', '18 de Septiembre 120', 'La Serena', 'ACTIVO'),
(5, 'DEL-005', 'Avenida del Mar', 'Av. del Mar 2000', 'La Serena', 'ACTIVO'),
(6, 'DEL-006', 'Rural', 'Camino Lambert Km 5', 'La Serena', 'ACTIVO');

INSERT IGNORE INTO `roles` (`id_rol`, `nombre`, `descripcion`, `permisos`, `alcance`) VALUES
(1, 'Administrador', 'Acceso total al sistema SGR', 'Crear, Leer, Editar, Eliminar', 'Comunal Completo'),
(2, 'Delegado Territorial', 'Gestión de atenciones locales', 'Crear, Leer, Editar Atenciones', 'Delegación Asignada');

INSERT IGNORE INTO `usuarios` (`id_usuario`, `rut`, `nombre_usuario`, `nombre`, `correo`, `clave`, `rol`, `delegacion`, `estado`) VALUES
(1, '11111111-1', 'admin', 'Administrador General', 'admin@laserena.cl', 'Admin1234!', 'Administrador', 'Todas (Comunal)', 'ACTIVO'),
(2, '12345678-9', 'alan.vk', 'Alan Von Kretschmann', 'alan.vk@laserena.cl', 'Delegado1234!', 'Delegado Territorial', 'Sector Centro', 'ACTIVO');

INSERT IGNORE INTO `items_metas` (`id_item`, `codigo`, `nombre`, `descripcion`, `estado`) VALUES
(1, 'MET-2024-01', 'Respuesta Rápida', 'Atención de urgencias en menos de 48 horas', 'Vigente');

INSERT IGNORE INTO `tipos_atencion` (`id_tipo`, `codigo`, `nombre`, `descripcion`, `estado`) VALUES
(1, 'TAT-01', 'Asistencia Social', 'Ayudas sociales y beneficios comunitarios', 'ACTIVO'),
(2, 'TAT-02', 'Infraestructura y Obras', 'Reparación de vías y alumbrado', 'ACTIVO'),
(3, 'TAT-03', 'Aseo y Ornato', 'Limpieza pública y retiro de escombros', 'ACTIVO');

INSERT IGNORE INTO `sub_atenciones` (`id_sub`, `codigo`, `nombre`, `tipo_asociado`, `estado`) VALUES
(1, 'SAT-0101', 'Caja de Alimentos', 'Asistencia Social', 'ACTIVO'),
(2, 'SAT-0201', 'Reparación de Luminarias', 'Infraestructura y Obras', 'ACTIVO'),
(3, 'SAT-0301', 'Retiro de Escombros', 'Aseo y Ornato', 'ACTIVO');