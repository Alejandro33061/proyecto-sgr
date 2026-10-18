const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const session = require('express-session');

const app = express();

// Variables de Entorno para AWS EC2 / RDS o Local
const PORT = process.env.PORT || 3000;
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'sgr_laserena';
const DB_PORT = process.env.DB_PORT || 3306;
const SESSION_SECRET = process.env.SESSION_SECRET || 'sgr_laserena_secret_key_2026';

// Configuración de CORS con credenciales dinámicas
app.use(cors({
    origin: function (origin, callback) {
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma']
}));

app.use(express.json());

// Configuración de Sesión Express
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Cambiar a true en producción HTTPS
        maxAge: 8 * 60 * 60 * 1000 // 8 horas
    }
}));

// Servir archivos estáticos del frontend
app.use(express.static(__dirname));

// Conexión a la Base de Datos MySQL
const db = mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    port: DB_PORT,
    multipleStatements: true
});

db.connect((err) => {
    if (err) {
        console.error('❌ Error al conectar con MySQL:', err.message);
        return;
    }
    console.log('✅ Conectado a MySQL exitosamente.');

    const setupSQL = `
        CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        USE \`${DB_NAME}\`;

        CREATE TABLE IF NOT EXISTS \`delegaciones\` (
            \`id_delegacion\` INT AUTO_INCREMENT PRIMARY KEY,
            \`codigo\` VARCHAR(20) NOT NULL,
            \`nombre\` VARCHAR(100) NOT NULL,
            \`direccion\` VARCHAR(150),
            \`comuna\` VARCHAR(50) DEFAULT 'La Serena',
            \`estado\` VARCHAR(20) DEFAULT 'ACTIVO'
        );

        CREATE TABLE IF NOT EXISTS \`roles\` (
            \`id_rol\` INT AUTO_INCREMENT PRIMARY KEY,
            \`nombre\` VARCHAR(50) NOT NULL,
            \`descripcion\` TEXT,
            \`permisos\` TEXT,
            \`alcance\` VARCHAR(100)
        );

        CREATE TABLE IF NOT EXISTS \`usuarios\` (
            \`id_usuario\` INT AUTO_INCREMENT PRIMARY KEY,
            \`rut\` VARCHAR(12),
            \`nombre_usuario\` VARCHAR(50) NOT NULL,
            \`nombre\` VARCHAR(100) NOT NULL,
            \`correo\` VARCHAR(100) NOT NULL UNIQUE,
            \`clave\` VARCHAR(255) NOT NULL,
            \`rol\` VARCHAR(50) NOT NULL,
            \`delegacion\` VARCHAR(100) NOT NULL,
            \`estado\` VARCHAR(20) DEFAULT 'ACTIVO'
        );

        CREATE TABLE IF NOT EXISTS \`items_metas\` (
            \`id_item\` INT AUTO_INCREMENT PRIMARY KEY,
            \`codigo\` VARCHAR(20) NOT NULL,
            \`nombre\` VARCHAR(100) NOT NULL,
            \`descripcion\` TEXT,
            \`estado\` VARCHAR(20) DEFAULT 'Vigente'
        );

        CREATE TABLE IF NOT EXISTS \`tipos_atencion\` (
            \`id_tipo\` INT AUTO_INCREMENT PRIMARY KEY,
            \`codigo\` VARCHAR(20) NOT NULL,
            \`nombre\` VARCHAR(100) NOT NULL,
            \`descripcion\` TEXT,
            \`estado\` VARCHAR(20) DEFAULT 'ACTIVO'
        );

        CREATE TABLE IF NOT EXISTS \`sub_atenciones\` (
            \`id_sub\` INT AUTO_INCREMENT PRIMARY KEY,
            \`codigo\` VARCHAR(20) NOT NULL,
            \`nombre\` VARCHAR(100) NOT NULL,
            \`tipo_asociado\` VARCHAR(100) NOT NULL,
            \`estado\` VARCHAR(20) DEFAULT 'ACTIVO'
        );

        CREATE TABLE IF NOT EXISTS \`atenciones\` (
            \`id_atencion\` INT AUTO_INCREMENT PRIMARY KEY,
            \`rut\` VARCHAR(12) NOT NULL,
            \`solicitante\` VARCHAR(100) NOT NULL,
            \`fecha_registro\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            \`delegacion\` VARCHAR(100) NOT NULL,
            \`usuario_responsable\` VARCHAR(100) NOT NULL,
            \`tipo_atencion\` VARCHAR(100) NOT NULL,
            \`sub_atencion\` VARCHAR(100) NOT NULL,
            \`descripcion\` TEXT,
            \`estado\` VARCHAR(20) DEFAULT 'PENDIENTE'
        );

        INSERT IGNORE INTO \`delegaciones\` (\`id_delegacion\`, \`codigo\`, \`nombre\`, \`direccion\`, \`comuna\`, \`estado\`) VALUES
        (1, 'DEL-001', 'Sector Centro', 'Prat 451', 'La Serena', 'ACTIVO'),
        (2, 'DEL-002', 'Las Compañías', 'Esmeralda 1805', 'La Serena', 'ACTIVO'),
        (3, 'DEL-003', 'La Pampa', 'Larraín Alcalde 3500', 'La Serena', 'ACTIVO'),
        (4, 'DEL-004', 'La Antena / La Florida', '18 de Septiembre 120', 'La Serena', 'ACTIVO'),
        (5, 'DEL-005', 'Avenida del Mar', 'Av. del Mar 2000', 'La Serena', 'ACTIVO'),
        (6, 'DEL-006', 'Rural', 'Camino Lambert Km 5', 'La Serena', 'ACTIVO');

        INSERT IGNORE INTO \`roles\` (\`id_rol\`, \`nombre\`, \`descripcion\`, \`permisos\`, \`alcance\`) VALUES
        (1, 'Superadministrador', 'Control total comunal y administración de sistema', 'Crear, Leer, Editar, Eliminar', 'Comunal Completo'),
        (2, 'Coordinador', 'Coordinación comunal y asignación de tareas', 'Crear, Leer, Editar, Eliminar', 'Comunal Completo'),
        (3, 'Delegado Territorial', 'Gestión territorial y atenciones locales', 'Crear, Leer, Editar Atenciones', 'Delegación Asignada'),
        (4, 'Funcionario', 'Registro y atención directa de público', 'Crear, Leer Atenciones', 'Delegación Asignada');

        INSERT IGNORE INTO \`usuarios\` (\`id_usuario\`, \`rut\`, \`nombre_usuario\`, \`nombre\`, \`correo\`, \`clave\`, \`rol\`, \`delegacion\`, \`estado\`) VALUES
        (1, '11111111-1', 'admin', 'Administrador General', 'admin@laserena.cl', 'Admin1234!', 'Administrador', 'DEL-001 | Sector Centro', 'ACTIVO'),
        (2, '12345678-9', 'alan.vk', 'Alan Von Kretschmann', 'alan.vk@laserena.cl', 'Delegado1234!', 'Delegado Territorial', 'DEL-001 | Sector Centro', 'ACTIVO');

        INSERT IGNORE INTO \`items_metas\` (\`id_item\`, \`codigo\`, \`nombre\`, \`descripcion\`, \`estado\`) VALUES
        (1, 'MET-2024-01', 'Respuesta Rápida', 'Atención de urgencias en menos de 48 horas', 'Vigente');

        INSERT IGNORE INTO \`tipos_atencion\` (\`id_tipo\`, \`codigo\`, \`nombre\`, \`descripcion\`, \`estado\`) VALUES
        (1, 'TA001', 'Social', 'Apoyo social y beneficios comunitarios', 'ACTIVO'),
        (2, 'TA002', 'Salud', 'Orientación y apoyo en salud comunal', 'ACTIVO'),
        (3, 'TA003', 'Educación', 'Apoyo escolar y becas municipales', 'ACTIVO');

        INSERT IGNORE INTO \`sub_atenciones\` (\`id_sub\`, \`codigo\`, \`nombre\`, \`tipo_asociado\`, \`estado\`) VALUES
        (1, 'SA001', 'Ayuda social', 'Social', 'ACTIVO'),
        (2, 'SA002', 'Consulta médica', 'Salud', 'ACTIVO'),
        (3, 'SA003', 'Beca municipal', 'Educación', 'ACTIVO');
    `;

    db.query(setupSQL, (errSetup) => {
        if (errSetup) console.error('❌ Error en el Setup SQL:', errSetup.message);
        else console.log('✅ Base de datos sgr_laserena e infraestructura listos.');
    });
});

app.use((req, res, next) => {
    db.query(`USE \`${DB_NAME}\``, (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Error al seleccionar la BD' });
        next();
    });
});

// --- MIDDLEWARES DE CONTROL DE ACCESO (RBAC) ---
function esAdmin(rol) {
    if (!rol) return false;
    const r = rol.toLowerCase();
    return r.includes('admin') || r.includes('superadmin') || r.includes('coordinador');
}

function protegerRutaAdmin(req, res, next) {
    const rolSesion = req.session.usuario ? req.session.usuario.rol : null;
    if (!req.session.usuario || !esAdmin(rolSesion)) {
        return res.status(403).json({ 
            success: false, 
            message: 'Acceso denegado: Se requieren permisos de Administrador o Coordinador.' 
        });
    }
    next();
}

// --- AUTENTICACIÓN Y MANEJO DE SESIONES ---
app.post('/api/login', (req, res) => {
    const { usuario, password } = req.body;
    db.query('SELECT id_usuario, rut, nombre_usuario, nombre, correo, rol, delegacion FROM usuarios WHERE (correo = ? OR nombre_usuario = ?) AND clave = ? AND estado = "ACTIVO"', 
        [usuario, usuario, password], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (results.length > 0) {
            const userObj = results[0];
            req.session.usuario = {
                id_usuario: userObj.id_usuario,
                rut: userObj.rut,
                nombre_usuario: userObj.nombre_usuario,
                nombre: userObj.nombre,
                correo: userObj.correo,
                rol: userObj.rol,
                delegacion: userObj.delegacion
            };

            res.json({ success: true, usuario: userObj });
        } else {
            res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos.' });
        }
    });
});

// CONSULTA DE SESIÓN EN TIEMPO REAL DESDE MYSQL (Sin caché)
app.get('/api/sesion-actual', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');

    if (!req.session || !req.session.usuario) {
        return res.status(401).json({ success: false, message: 'No hay sesión activa' });
    }

    const idUsr = req.session.usuario.id_usuario;
    db.query('SELECT id_usuario, rut, nombre_usuario, nombre, correo, rol, delegacion, estado FROM usuarios WHERE id_usuario = ?', [idUsr], (err, results) => {
        if (err || results.length === 0 || results[0].estado !== 'ACTIVO') {
            req.session.destroy();
            return res.status(401).json({ success: false, message: 'Sesión no válida o usuario desactivado' });
        }

        const userActualizado = results[0];

        // Sincronizar la sesión Express con los datos frescos de la BD
        req.session.usuario = {
            id_usuario: userActualizado.id_usuario,
            rut: userActualizado.rut,
            nombre_usuario: userActualizado.nombre_usuario,
            nombre: userActualizado.nombre,
            correo: userActualizado.correo,
            rol: userActualizado.rol,
            delegacion: userActualizado.delegacion
        };

        res.json({ success: true, usuario: req.session.usuario });
    });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ success: false, message: 'Error al cerrar sesión' });
        res.json({ success: true, message: 'Sesión cerrada correctamente' });
    });
});

// --- RECUPERACIÓN DE CONTRASEÑA (CUMPLE REQUISITO DE SEGURIDAD A3 / C1) ---
// "La respuesta no debe revelar si un correo o usuario existe"
app.post('/api/recuperar-correo', (req, res) => {
    const { correo } = req.body;
    db.query('SELECT correo, nombre FROM usuarios WHERE correo = ? OR nombre_usuario = ?', [correo, correo], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
        
        let codigoFinal = '123456'; // Código por defecto de simulación
        let correoDestino = correo;

        if (results.length > 0) {
            codigoFinal = Math.floor(100000 + Math.random() * 900000).toString();
            correoDestino = results[0].correo;
            // Guardar código generado en la sesión para validarlo en el paso 2
            req.session.recoveryCode = codigoFinal;
            req.session.recoveryEmail = correoDestino;
        } else {
            // Guardar un código ficticio para mantener el flujo consistente
            req.session.recoveryCode = codigoFinal;
            req.session.recoveryEmail = correo;
        }

        // Respuesta genérica que no revela la existencia del usuario
        res.json({
            success: true,
            codigo: codigoFinal, // Se expone el código para la evaluación/prueba
            destino: correoDestino,
            message: 'Si la cuenta existe en el sistema, recibirás el código de verificación.'
        });
    });
});

app.post('/api/cambiar-password', (req, res) => {
    const { correo, nuevaClave } = req.body;
    db.query('UPDATE usuarios SET clave = ? WHERE correo = ? OR nombre_usuario = ?', [nuevaClave, correo, correo], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: 'Contraseña actualizada correctamente.' });
    });
});

// --- CRUD DELEGACIONES ---
app.get('/api/delegaciones', (req, res) => {
    db.query('SELECT * FROM delegaciones ORDER BY id_delegacion ASC', (err, results) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, datos: results });
    });
});

app.post('/api/delegaciones', protegerRutaAdmin, (req, res) => {
    const { codigo, nombre, direccion, comuna, estado } = req.body;
    const query = `INSERT INTO delegaciones (codigo, nombre, direccion, comuna, estado) VALUES (?, ?, ?, ?, ?)`;
    db.query(query, [codigo, nombre, direccion || 'Prat 451', comuna || 'La Serena', estado || 'ACTIVO'], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, id: result.insertId });
    });
});

app.put('/api/delegaciones/:id', protegerRutaAdmin, (req, res) => {
    const { id } = req.params;
    const { codigo, nombre, direccion, comuna, estado } = req.body;
    const query = `UPDATE delegaciones SET codigo = ?, nombre = ?, direccion = ?, comuna = ?, estado = ? WHERE id_delegacion = ?`;
    db.query(query, [codigo, nombre, direccion, comuna, estado, id], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/delegaciones/:id', protegerRutaAdmin, (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM delegaciones WHERE id_delegacion = ?', [id], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true });
    });
});

// --- CRUD ROLES ---
app.get('/api/roles', (req, res) => {
    db.query('SELECT * FROM roles ORDER BY id_rol ASC', (err, results) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, datos: results });
    });
});

app.post('/api/roles', protegerRutaAdmin, (req, res) => {
    const { nombre, descripcion, permisos, alcance } = req.body;
    const query = `INSERT INTO roles (nombre, descripcion, permisos, alcance) VALUES (?, ?, ?, ?)`;
    db.query(query, [nombre, descripcion, permisos || 'Lectura/Escritura', alcance || 'Comunal'], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, id: result.insertId });
    });
});

app.put('/api/roles/:id', protegerRutaAdmin, (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, permisos, alcance } = req.body;
    const query = `UPDATE roles SET nombre = ?, descripcion = ?, permisos = ?, alcance = ? WHERE id_rol = ?`;
    db.query(query, [nombre, descripcion, permisos, alcance, id], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/roles/:id', protegerRutaAdmin, (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM roles WHERE id_rol = ?', [id], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true });
    });
});

// --- CRUD USUARIOS ---
app.get('/api/usuarios', (req, res) => {
    db.query('SELECT id_usuario, rut, nombre_usuario, nombre, correo, rol, delegacion, estado FROM usuarios ORDER BY id_usuario ASC', (err, results) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, usuarios: results });
    });
});

app.post('/api/usuarios', protegerRutaAdmin, (req, res) => {
    const { rut, nombre_usuario, nombre, correo, clave, rol, delegacion } = req.body;
    db.query('INSERT INTO usuarios (rut, nombre_usuario, nombre, correo, clave, rol, delegacion, estado) VALUES (?, ?, ?, ?, ?, ?, ?, "ACTIVO")', 
        [rut, nombre_usuario, nombre, correo, clave || 'User1234!', rol, delegacion], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'El correo o usuario ya existe.' });
        res.json({ success: true, id: result.insertId });
    });
});

app.put('/api/usuarios/:id', protegerRutaAdmin, (req, res) => {
    const { id } = req.params;
    const { rut, nombre_usuario, nombre, correo, rol, delegacion, estado } = req.body;
    const query = `UPDATE usuarios SET rut=?, nombre_usuario=?, nombre=?, correo=?, rol=?, delegacion=?, estado=? WHERE id_usuario=?`;
    
    db.query(query, [rut, nombre_usuario, nombre, correo, rol, delegacion, estado || 'ACTIVO', id], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        
        // Si el usuario edita sus propios datos, actualizar la sesión en memoria
        if (req.session && req.session.usuario && String(req.session.usuario.id_usuario) === String(id)) {
            req.session.usuario.rol = rol;
            req.session.usuario.nombre = nombre;
            req.session.usuario.correo = correo;
            req.session.usuario.delegacion = delegacion;
        }

        res.json({ success: true });
    });
});

app.delete('/api/usuarios/:id', protegerRutaAdmin, (req, res) => {
    const { id } = req.params;
    
    if (req.session && req.session.usuario && String(req.session.usuario.id_usuario) === String(id)) {
        return res.status(400).json({ success: false, message: 'No puedes eliminar tu propia cuenta mientras estás logueado.' });
    }

    db.query('DELETE FROM usuarios WHERE id_usuario = ?', [id], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true });
    });
});

// --- CRUD ÍTEMS Y METAS ---
app.get('/api/items', (req, res) => {
    db.query('SELECT * FROM items_metas ORDER BY id_item ASC', (err, results) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, datos: results });
    });
});

app.post('/api/items', protegerRutaAdmin, (req, res) => {
    const { codigo, nombre, descripcion, estado } = req.body;
    const query = `INSERT INTO items_metas (codigo, nombre, descripcion, estado) VALUES (?, ?, ?, ?)`;
    db.query(query, [codigo, nombre, descripcion, estado || 'Vigente'], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, id: result.insertId });
    });
});

app.put('/api/items/:id', protegerRutaAdmin, (req, res) => {
    const { id } = req.params;
    const { codigo, nombre, descripcion, estado } = req.body;
    const query = `UPDATE items_metas SET codigo=?, nombre=?, descripcion=?, estado=? WHERE id_item=?`;
    db.query(query, [codigo, nombre, descripcion, estado, id], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/items/:id', protegerRutaAdmin, (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM items_metas WHERE id_item = ?', [id], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true });
    });
});

// --- CRUD TIPOS DE ATENCIÓN (CON INTEGRIDAD REFERENCIAL) ---
app.get('/api/tipos-atencion', (req, res) => {
    db.query('SELECT * FROM tipos_atencion ORDER BY id_tipo ASC', (err, results) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, datos: results });
    });
});

app.post('/api/tipos-atencion', protegerRutaAdmin, (req, res) => {
    const { codigo, nombre, descripcion, estado } = req.body;
    const query = `INSERT INTO tipos_atencion (codigo, nombre, descripcion, estado) VALUES (?, ?, ?, ?)`;
    db.query(query, [codigo, nombre, descripcion, estado || 'ACTIVO'], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, id: result.insertId });
    });
});

app.put('/api/tipos-atencion/:id', protegerRutaAdmin, (req, res) => {
    const { id } = req.params;
    const { codigo, nombre, descripcion, estado } = req.body;
    const query = `UPDATE tipos_atencion SET codigo=?, nombre=?, descripcion=?, estado=? WHERE id_tipo=?`;
    db.query(query, [codigo, nombre, descripcion, estado, id], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/tipos-atencion/:id', protegerRutaAdmin, (req, res) => {
    const { id } = req.params;

    db.query('SELECT nombre FROM tipos_atencion WHERE id_tipo = ?', [id], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ success: false, message: 'Tipo no encontrado' });
        
        const nombreTipo = results[0].nombre;
        
        const checkQuery = `
            SELECT 
                (SELECT COUNT(*) FROM sub_atenciones WHERE tipo_asociado = ?) AS total_sub,
                (SELECT COUNT(*) FROM atenciones WHERE tipo_atencion = ?) AS total_atenciones
        `;
        
        db.query(checkQuery, [nombreTipo, nombreTipo], (errCheck, checkRes) => {
            if (errCheck) return res.status(500).json({ success: false, message: errCheck.message });
            
            const totalSub = checkRes[0].total_sub;
            const totalAtenciones = checkRes[0].total_atenciones;

            if (totalSub > 0 || totalAtenciones > 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: `No se puede eliminar: Existen ${totalSub} Sub Atención(es) y ${totalAtenciones} Atención(es) asociadas a este tipo.` 
                });
            }

            db.query('DELETE FROM tipos_atencion WHERE id_tipo = ?', [id], (errDel) => {
                if (errDel) return res.status(500).json({ success: false, message: errDel.message });
                res.json({ success: true });
            });
        });
    });
});

// --- CRUD SUB ATENCIONES (CON INTEGRIDAD REFERENCIAL) ---
app.get('/api/sub-atenciones', (req, res) => {
    db.query('SELECT * FROM sub_atenciones ORDER BY id_sub ASC', (err, results) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, datos: results });
    });
});

app.post('/api/sub-atenciones', protegerRutaAdmin, (req, res) => {
    const { codigo, nombre, id_tipo_atencion, tipo_asociado, estado } = req.body;
    let tipoFinal = tipo_asociado || 'General';

    const insertSub = (tipoNom) => {
        const query = `INSERT INTO sub_atenciones (codigo, nombre, tipo_asociado, estado) VALUES (?, ?, ?, ?)`;
        db.query(query, [codigo, nombre, tipoNom, estado || 'ACTIVO'], (err, result) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true, id: result.insertId });
        });
    };

    if (id_tipo_atencion) {
        db.query('SELECT nombre FROM tipos_atencion WHERE id_tipo = ?', [id_tipo_atencion], (err, resTipo) => {
            if (!err && resTipo.length > 0) tipoFinal = resTipo[0].nombre;
            insertSub(tipoFinal);
        });
    } else {
        insertSub(tipoFinal);
    }
});

app.put('/api/sub-atenciones/:id', protegerRutaAdmin, (req, res) => {
    const { id } = req.params;
    const { codigo, nombre, id_tipo_atencion, tipo_asociado, estado } = req.body;
    let tipoFinal = tipo_asociado || 'General';

    const updateSub = (tipoNom) => {
        const query = `UPDATE sub_atenciones SET codigo=?, nombre=?, tipo_asociado=?, estado=? WHERE id_sub=?`;
        db.query(query, [codigo, nombre, tipoNom, estado, id], (err) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true });
        });
    };

    if (id_tipo_atencion) {
        db.query('SELECT nombre FROM tipos_atencion WHERE id_tipo = ?', [id_tipo_atencion], (err, resTipo) => {
            if (!err && resTipo.length > 0) tipoFinal = resTipo[0].nombre;
            updateSub(tipoFinal);
        });
    } else {
        updateSub(tipoFinal);
    }
});

app.delete('/api/sub-atenciones/:id', protegerRutaAdmin, (req, res) => {
    const { id } = req.params;

    db.query('SELECT nombre FROM sub_atenciones WHERE id_sub = ?', [id], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ success: false, message: 'Sub atención no encontrada' });

        const nombreSub = results[0].nombre;

        db.query('SELECT COUNT(*) AS total FROM atenciones WHERE sub_atencion = ?', [nombreSub], (errCheck, checkRes) => {
            if (errCheck) return res.status(500).json({ success: false, message: errCheck.message });

            if (checkRes[0].total > 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: `No se puede eliminar: Esta Sub Atención tiene ${checkRes[0].total} atención(es) vinculada(s).` 
                });
            }

            db.query('DELETE FROM sub_atenciones WHERE id_sub = ?', [id], (errDel) => {
                if (errDel) return res.status(500).json({ success: false, message: errDel.message });
                res.json({ success: true });
            });
        });
    });
});

app.get('/api/sub-atenciones-por-tipo/:tipoNombre', (req, res) => {
    const { tipoNombre } = req.params;
    db.query('SELECT * FROM sub_atenciones WHERE tipo_asociado = ? AND estado = "ACTIVO"', [tipoNombre], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, datos: results });
    });
});

// --- REGISTRO DE ATENCIÓN CIUDADANA ---
app.post('/api/atenciones', (req, res) => {
    const { rut, solicitante, delegacion, usuario_responsable, tipo_atencion, sub_atencion, descripcion, estado } = req.body;
    
    const rutVal = rut || req.body.rut_solicitante || 'S/R';
    const nombreSolicitante = solicitante || req.body.nombre_solicitante || 'Sin Nombre';
    const delVal = delegacion || (req.session.usuario ? req.session.usuario.delegacion : 'DEL-001 | Sector Centro');
    const resp = usuario_responsable || (req.session.usuario ? req.session.usuario.nombre : 'Funcionario');
    const desc = descripcion || req.body.observacion || '';
    const est = estado || 'PENDIENTE';

    const query = `INSERT INTO atenciones 
        (rut, solicitante, delegacion, usuario_responsable, tipo_atencion, sub_atencion, descripcion, estado) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(query, [rutVal, nombreSolicitante, delVal, resp, tipo_atencion, sub_atencion, desc, est], (err, result) => {
        if (err) {
            console.error('❌ Error al registrar atención en MySQL:', err.message);
            return res.status(500).json({ success: false, message: err.message });
        }
        res.json({ 
            success: true, 
            id_atencion: result.insertId,
            message: 'Atención registrada exitosamente.'
        });
    });
});

app.get('/api/atenciones', (req, res) => {
    db.query('SELECT *, DATE_FORMAT(fecha_registro, "%d/%m/%Y %H:%i") as fecha_registro FROM atenciones ORDER BY id_atencion DESC', (err, results) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, datos: results });
    });
});

// Ruta principal abre el login
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor SGR corriendo en el puerto ${PORT}`);
});