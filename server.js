const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const app = express();

const PORT = process.env.PORT || 3000;
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'sgr_laserena';
const DB_PORT = process.env.DB_PORT || 3306;
const SESSION_SECRET = process.env.SESSION_SECRET || 'sgr_laserena_secret_key_2026';

// Configuración de Nodemailer garantizada para Gmail SMTP
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // SSL
    auth: {
        user: 'alejandrocantillanes@gmail.com',
        pass: 'eyivqvohfskptpus'
    },
    tls: {
        rejectUnauthorized: false // Evita bloqueos de certificados SSL en entornos locales
    }
});

// Verificar la conexión del correo al iniciar el servidor
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Error en el servidor SMTP de Gmail:', error.message);
    } else {
        console.log('📧 Servidor Nodemailer (Gmail) listo para enviar correos.');
    }
});

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

app.use(cors({
    origin: function (origin, callback) { return callback(null, true); },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma']
}));

app.use(express.json());

app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 8 * 60 * 60 * 1000 }
}));

app.use(express.static(__dirname));

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
            \`codigo\` VARCHAR(20) DEFAULT NULL,
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
            \`estado\` VARCHAR(20) DEFAULT 'ACTIVO',
            \`requiere_cambio_clave\` BOOLEAN DEFAULT 0
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
            \`delegacion\` VARCHAR(100) DEFAULT 'Todas (Comunal)',
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
    `;

    db.query(setupSQL, (errSetup) => {
        if (errSetup) {
            console.error('❌ Error en el Setup SQL:', errSetup.message);
            return;
        }

        db.query("SHOW COLUMNS FROM `tipos_atencion` LIKE 'delegacion'", (errCol, colRes) => {
            const agregarColSQL = (colRes && colRes.length > 0) 
                ? "SELECT 1" 
                : "ALTER TABLE `tipos_atencion` ADD COLUMN `delegacion` VARCHAR(100) DEFAULT 'Todas (Comunal)';";

            db.query(agregarColSQL, () => {
                const insertsSQL = `
                    INSERT IGNORE INTO \`delegaciones\` (\`id_delegacion\`, \`codigo\`, \`nombre\`, \`direccion\`, \`comuna\`, \`estado\`) VALUES
                    (1, 'DEL-001', 'Sector Centro', 'Prat 451', 'La Serena', 'ACTIVO'),
                    (2, 'DEL-002', 'Las Compañías', 'Esmeralda 1805', 'La Serena', 'ACTIVO'),
                    (3, 'DEL-003', 'La Pampa', 'Larraín Alcalde 3500', 'La Serena', 'ACTIVO'),
                    (4, 'DEL-004', 'La Antena / La Florida', '18 de Septiembre 120', 'La Serena', 'ACTIVO'),
                    (5, 'DEL-005', 'Avenida del Mar', 'Av. del Mar 2000', 'La Serena', 'ACTIVO'),
                    (6, 'DEL-006', 'Rural', 'Camino Lambert Km 5', 'La Serena', 'ACTIVO');

                    INSERT IGNORE INTO \`roles\` (\`id_rol\`, \`codigo\`, \`nombre\`, \`descripcion\`, \`permisos\`, \`alcance\`) VALUES
                    (1, 'ROL01', 'Superadministrador', 'Control total comunal y administración de sistema', 'Crear, Leer, Editar, Eliminar', 'Comunal Completo'),
                    (2, 'ROL02', 'Coordinador', 'Coordinación comunal y asignación de tareas', 'Crear, Leer, Editar, Eliminar', 'Comunal Completo'),
                    (3, 'ROL03', 'Delegado Territorial', 'Gestión territorial y atenciones locales', 'Crear, Leer, Editar Atenciones', 'Delegación Asignada'),
                    (4, 'ROL04', 'Funcionario', 'Registro y atención directa de público', 'Crear, Leer Atenciones', 'Delegación Asignada');

                    INSERT IGNORE INTO \`usuarios\` (\`id_usuario\`, \`rut\`, \`nombre_usuario\`, \`nombre\`, \`correo\`, \`clave\`, \`rol\`, \`delegacion\`, \`estado\`, \`requiere_cambio_clave\`) VALUES
                    (1, '11111111-1', 'admin', 'Administrador General', 'admin@laserena.cl', 'Admin1234!', 'Administrador', 'DEL-001 | Sector Centro', 'ACTIVO', 0),
                    (2, '12345678-9', 'alan.vk', 'Alan Von Kretschmann', 'alan.vk@laserena.cl', 'Delegado1234!', 'Delegado Territorial', 'DEL-001 | Sector Centro', 'ACTIVO', 0);

                    INSERT IGNORE INTO \`items_metas\` (\`id_item\`, \`codigo\`, \`nombre\`, \`descripcion\`, \`estado\`) VALUES
                    (1, 'MET-2026-01', 'Respuesta Rápida', 'Atención de urgencias en menos de 48 horas', 'Vigente');

                    INSERT IGNORE INTO \`tipos_atencion\` (\`id_tipo\`, \`codigo\`, \`nombre\`, \`descripcion\`, \`delegacion\`, \`estado\`) VALUES
                    (1, 'TAT-01', 'Social', 'Apoyo social y beneficios comunitarios', 'Todas (Comunal)', 'ACTIVO'),
                    (2, 'TAT-02', 'Salud', 'Orientación y apoyo en salud comunal', 'Todas (Comunal)', 'ACTIVO'),
                    (3, 'TAT-03', 'Educación', 'Apoyo escolar y becas municipales', 'Todas (Comunal)', 'ACTIVO');

                    INSERT IGNORE INTO \`sub_atenciones\` (\`id_sub\`, \`codigo\`, \`nombre\`, \`tipo_asociado\`, \`estado\`) VALUES
                    (1, 'SAT-0101', 'Ayuda social', 'Social', 'ACTIVO'),
                    (2, 'SAT-0201', 'Consulta médica', 'Salud', 'ACTIVO'),
                    (3, 'SAT-0301', 'Beca municipal', 'Educación', 'ACTIVO');
                `;

                db.query(insertsSQL, (errInserts) => {
                    if (errInserts) console.error('❌ Error cargando datos iniciales:', errInserts.message);
                    else console.log('✅ Base de datos e infraestructura listos.');
                });
            });
        });
    });
});

app.use((req, res, next) => {
    db.query(`USE \`${DB_NAME}\``, (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Error al seleccionar la BD' });
        next();
    });
});

// --- MIDDLEWARES DE CONTROL DE ACCESO ---
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

// --- AUTENTICACIÓN Y SESIONES ---
app.post('/api/login', (req, res) => {
    const { usuario, password } = req.body;
    db.query('SELECT id_usuario, rut, nombre_usuario, nombre, correo, clave, rol, delegacion, requiere_cambio_clave FROM usuarios WHERE (correo = ? OR nombre_usuario = ?) AND clave = ? AND estado = "ACTIVO"', 
        [usuario, usuario, password], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (results.length > 0) {
            const userObj = results[0];

            if (userObj.requiere_cambio_clave === 1) {
                return res.json({ 
                    success: true, 
                    requirePasswordChange: true, 
                    correo: userObj.correo,
                    message: 'Debe cambiar su contraseña provisoria antes de acceder al sistema.' 
                });
            }

            req.session.usuario = {
                id_usuario: userObj.id_usuario,
                rut: userObj.rut,
                nombre_usuario: userObj.nombre_usuario,
                nombre: userObj.nombre,
                correo: userObj.correo,
                rol: userObj.rol,
                delegacion: userObj.delegacion
            };

            res.json({ success: true, usuario: req.session.usuario });
        } else {
            res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos.' });
        }
    });
});

app.post('/api/cambiar-clave-primer-ingreso', (req, res) => {
    const { correo, nuevaClave } = req.body;
    db.query('UPDATE usuarios SET clave = ?, requiere_cambio_clave = 0 WHERE correo = ?', [nuevaClave, correo], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: 'Contraseña actualizada exitosamente. Inicie sesión nuevamente.' });
    });
});

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

// --- RECUPERACIÓN DE CONTRASEÑA EN 3 PASOS ESTRICTOS ---
app.post('/api/recuperar-correo', (req, res) => {
    const { correo } = req.body;
    
    if (!correo || correo.trim() === '') {
        return res.status(400).json({ success: false, message: 'Debe ingresar un correo electrónico o nombre de usuario.' });
    }

    const querySearch = 'SELECT correo, nombre FROM usuarios WHERE (correo = ? OR nombre_usuario = ?) AND estado = "ACTIVO"';
    
    db.query(querySearch, [correo.trim(), correo.trim()], async (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Error interno de la base de datos.' });

        if (results.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'El correo o nombre de usuario ingresado no existe en nuestro sistema.' 
            });
        }

        const usuarioEncontrado = results[0];
        const correoDestino = usuarioEncontrado.correo;
        const codigoGenerado = Math.floor(100000 + Math.random() * 900000).toString();

        req.session.recoveryCode = codigoGenerado;
        req.session.recoveryEmail = correoDestino;
        req.session.recoveryVerified = false;

        const mailOptions = {
            from: '"Muni La Serena - SGR" <alejandrocantillanes@gmail.com>',
            to: correoDestino,
            subject: 'Código de Recuperación de Contraseña - SGR',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                    <h2 style="color: #8B1E28; margin-bottom: 5px;">Municipalidad de La Serena</h2>
                    <p style="font-size: 1.1em; color: #333;">Hola <strong>${usuarioEncontrado.nombre}</strong>,</p>
                    <p>Has solicitado restablecer tu contraseña en el Sistema SGR.</p>
                    <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #8B1E28; margin: 20px 0; text-align: center;">
                        <span style="font-size: 0.9em; text-transform: uppercase; letter-spacing: 1px; color: #666;">Tu Código de Verificación es:</span><br>
                        <strong style="font-size: 2.2em; letter-spacing: 6px; color: #8B1E28; font-family: monospace;">${codigoGenerado}</strong>
                    </div>
                    <p style="color: #666; font-size: 0.9em;">Este código es de un solo uso. Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
                </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            res.json({
                success: true,
                destino: correoDestino,
                message: `Código enviado con éxito al correo ${correoDestino}.`
            });
        } catch (mailError) {
            console.error('❌ Error enviando mail de recuperación:', mailError);
            res.status(500).json({ 
                success: false, 
                message: `El usuario existe pero ocurrió un error al enviar el correo: ${mailError.message}` 
            });
        }
    });
});

app.post('/api/verificar-codigo-recuperacion', (req, res) => {
    const { codigo } = req.body;

    if (!req.session.recoveryCode || !req.session.recoveryEmail) {
        return res.status(400).json({ success: false, message: 'La sesión de recuperación ha expirado. Solicite un nuevo código.' });
    }

    if (String(codigo).trim() === String(req.session.recoveryCode)) {
        req.session.recoveryVerified = true;
        return res.json({ success: true, message: 'Código verificado correctamente.' });
    } else {
        return res.status(400).json({ success: false, message: 'El código ingresado es incorrecto.' });
    }
});

app.post('/api/cambiar-password-recuperado', (req, res) => {
    const { nuevaClave } = req.body;

    if (!req.session.recoveryVerified || !req.session.recoveryEmail) {
        return res.status(403).json({ success: false, message: 'No has verificado el código de recuperación aún.' });
    }

    const correoTarget = req.session.recoveryEmail;

    db.query('UPDATE usuarios SET clave = ?, requiere_cambio_clave = 0 WHERE correo = ?', [nuevaClave, correoTarget], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });

        delete req.session.recoveryCode;
        delete req.session.recoveryEmail;
        delete req.session.recoveryVerified;

        res.json({ success: true, message: 'Contraseña restablecida exitosamente. Inicie sesión con su nueva clave.' });
    });
});

// --- CRUD DELEGACIONES ---
app.get('/api/delegaciones', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const estado = req.query.estado || '';

    let query = 'SELECT SQL_CALC_FOUND_ROWS * FROM delegaciones WHERE 1=1';
    let params = [];

    if (search) {
        query += ' AND (nombre LIKE ? OR codigo LIKE ? OR comuna LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (estado) {
        query += ' AND estado = ?';
        params.push(estado);
    }

    query += ' ORDER BY id_delegacion ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    db.query(query, params, (err, results) => {
        if (err) return res.status(500).json({ success: false, message: err.message });

        db.query('SELECT FOUND_ROWS() as total', (errTotal, totalRes) => {
            if (errTotal) return res.status(500).json({ success: false, message: errTotal.message });
            const total = totalRes[0].total;

            res.json({ 
                success: true, 
                datos: results,
                paginacion: {
                    totalRegistros: total,
                    totalPaginas: Math.ceil(total / limit) || 1,
                    paginaActual: page,
                    limite: limit
                }
            });
        });
    });
});

app.post('/api/delegaciones', protegerRutaAdmin, (req, res) => {
    let { codigo, nombre, direccion, comuna, estado } = req.body;
    const comunaFinal = comuna && comuna.trim() !== '' ? comuna : 'La Serena';

    const guardarDelegacion = (codigoFinal) => {
        const query = `INSERT INTO delegaciones (codigo, nombre, direccion, comuna, estado) VALUES (?, ?, ?, ?, ?)`;
        db.query(query, [codigoFinal, nombre, direccion || 'Prat 451', comunaFinal, estado || 'ACTIVO'], (err, result) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true, id: result.insertId, codigo: codigoFinal });
        });
    };

    if (!codigo || codigo.trim() === '' || codigo.toLowerCase().includes('auto')) {
        db.query('SELECT codigo FROM delegaciones', (err, results) => {
            if (err) return res.status(500).json({ success: false, message: err.message });

            const numeros = results
                .map(r => {
                    if (r.codigo) {
                        const match = r.codigo.match(/\d+/);
                        return match ? parseInt(match[0], 10) : null;
                    }
                    return null;
                })
                .filter(n => n !== null && n > 0)
                .sort((a, b) => a - b);

            let libre = 1;
            while (numeros.includes(libre)) { libre++; }

            const codigoGenerado = `DEL-${String(libre).padStart(3, '0')}`;
            guardarDelegacion(codigoGenerado);
        });
    } else {
        guardarDelegacion(codigo);
    }
});

app.put('/api/delegaciones/:id', protegerRutaAdmin, (req, res) => {
    const { id } = req.params;
    const { codigo, nombre, direccion, comuna, estado } = req.body;
    const comunaFinal = comuna && comuna.trim() !== '' ? comuna : 'La Serena';
    const query = `UPDATE delegaciones SET codigo = ?, nombre = ?, direccion = ?, comuna = ?, estado = ? WHERE id_delegacion = ?`;
    db.query(query, [codigo, nombre, direccion, comunaFinal, estado, id], (err) => {
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
    db.query('SELECT id_rol, codigo, nombre, descripcion, permisos, alcance FROM roles ORDER BY id_rol ASC', (err, results) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, datos: results });
    });
});

app.post('/api/roles', protegerRutaAdmin, (req, res) => {
    let { codigo, nombre, descripcion, permisos, alcance } = req.body;

    db.query('SELECT codigo FROM roles', (err, results) => {
        if (err) return res.status(500).json({ success: false, message: err.message });

        const numerosUsados = results
            .map(r => {
                if (r.codigo && r.codigo.startsWith('ROL')) {
                    const match = r.codigo.match(/\d+/);
                    return match ? parseInt(match[0], 10) : null;
                }
                return null;
            })
            .filter(n => n !== null && n > 0)
            .sort((a, b) => a - b);

        let libre = 1;
        while (numerosUsados.includes(libre)) { libre++; }

        const codigoGenerado = (codigo && String(codigo).trim() !== '' && !codigo.toLowerCase().includes('auto')) 
            ? codigo 
            : `ROL${String(libre).padStart(2, '0')}`;

        // Dejar que id_rol sea asignado automáticamente por MySQL (AUTO_INCREMENT)
        const query = `INSERT INTO roles (codigo, nombre, descripcion, permisos, alcance) VALUES (?, ?, ?, ?, ?)`;
        db.query(query, [codigoGenerado, nombre, descripcion || 'Sin descripción', permisos || 'Lectura/Escritura', alcance || 'Comunal'], (errIns, result) => {
            if (errIns) return res.status(500).json({ success: false, message: errIns.message });
            res.json({ success: true, id: result.insertId, codigo: codigoGenerado });
        });
    });
});

app.put('/api/roles/:id', protegerRutaAdmin, (req, res) => {
    const { id } = req.params;
    const { codigo, nombre, descripcion, permisos, alcance } = req.body;
    const query = `UPDATE roles SET codigo = ?, nombre = ?, descripcion = ?, permisos = ?, alcance = ? WHERE id_rol = ?`;
    db.query(query, [codigo, nombre, descripcion, permisos, alcance, id], (err) => {
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const estado = req.query.estado || '';

    let query = 'SELECT SQL_CALC_FOUND_ROWS id_usuario, rut, nombre_usuario, nombre, correo, rol, delegacion, estado, requiere_cambio_clave FROM usuarios WHERE 1=1';
    let params = [];

    if (search) {
        query += ' AND (nombre LIKE ? OR correo LIKE ? OR rol LIKE ? OR nombre_usuario LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (estado) {
        query += ' AND estado = ?';
        params.push(estado);
    }

    query += ' ORDER BY id_usuario ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    db.query(query, params, (err, results) => {
        if (err) return res.status(500).json({ success: false, message: err.message });

        db.query('SELECT FOUND_ROWS() as total', (errTotal, totalRes) => {
            if (errTotal) return res.status(500).json({ success: false, message: errTotal.message });
            const total = totalRes[0].total;

            res.json({ 
                success: true, 
                usuarios: results,
                paginacion: {
                    totalRegistros: total,
                    totalPaginas: Math.ceil(total / limit) || 1,
                    paginaActual: page,
                    limite: limit
                }
            });
        });
    });
});

app.post('/api/usuarios', protegerRutaAdmin, (req, res) => {
    const { rut, nombre_usuario, nombre, correo, rol, delegacion } = req.body;

    if (!correo || !EMAIL_REGEX.test(correo.trim())) {
        return res.status(400).json({ success: false, message: 'El formato del correo electrónico es inválido.' });
    }

    const claveProvisoria = crypto.randomBytes(4).toString('hex');

    db.query('INSERT INTO usuarios (rut, nombre_usuario, nombre, correo, clave, rol, delegacion, estado, requiere_cambio_clave) VALUES (?, ?, ?, ?, ?, ?, ?, "ACTIVO", 1)', 
        [rut || '12345678-9', nombre_usuario, nombre, correo.trim(), claveProvisoria, rol, delegacion], async (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'El correo o nombre de usuario ya existe.' });

        const mailOptions = {
            from: '"Muni La Serena - SGR" <alejandrocantillanes@gmail.com>',
            to: correo.trim(),
            subject: 'Credenciales de Acceso - Sistema SGR',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                    <h2 style="color: #8B1E28;">Municipalidad de La Serena</h2>
                    <p>Estimado/a <strong>${nombre}</strong>,</p>
                    <p>Se ha creado exitosamente su cuenta de acceso para el <strong>Sistema SGR</strong>.</p>
                    <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #8B1E28; margin: 20px 0;">
                        <p style="margin: 0;"><strong>Usuario:</strong> ${correo.trim()}</p>
                        <p style="margin: 5px 0 0 0;"><strong>Clave Provisoria:</strong> <span style="font-family: monospace; font-size: 1.1em; color: #8B1E28;">${claveProvisoria}</span></p>
                    </div>
                    <p><em>Nota: Deberá cambiar esta contraseña obligatoriamente al iniciar sesión.</em></p>
                </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            res.json({ success: true, id: result.insertId, message: 'Usuario creado y correo enviado.' });
        } catch (mailError) {
            console.error('❌ Error enviando mail:', mailError);
            res.json({ success: true, id: result.insertId, message: 'Usuario creado pero falló el envío del correo.' });
        }
    });
});

app.put('/api/usuarios/:id', protegerRutaAdmin, (req, res) => {
    const { id } = req.params;
    const { rut, nombre_usuario, nombre, correo, rol, delegacion, estado } = req.body;

    if (!correo || !EMAIL_REGEX.test(correo.trim())) {
        return res.status(400).json({ success: false, message: 'El formato del correo es inválido.' });
    }

    const query = `UPDATE usuarios SET rut=?, nombre_usuario=?, nombre=?, correo=?, rol=?, delegacion=?, estado=? WHERE id_usuario=?`;
    
    db.query(query, [rut, nombre_usuario, nombre, correo.trim(), rol, delegacion, estado || 'ACTIVO', id], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        
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
        return res.status(400).json({ success: false, message: 'No puedes eliminar tu propia cuenta.' });
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
    let { codigo, nombre, descripcion, estado } = req.body;
    const anioActual = new Date().getFullYear();

    const guardarItem = (codigoFinal) => {
        const query = `INSERT INTO items_metas (codigo, nombre, descripcion, estado) VALUES (?, ?, ?, ?)`;
        db.query(query, [codigoFinal, nombre, descripcion || 'Sin descripción', estado || 'Vigente'], (err, result) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true, id: result.insertId, codigo: codigoFinal });
        });
    };

    if (!codigo || String(codigo).trim() === '' || String(codigo).trim().toLowerCase() === 'auto') {
        db.query('SELECT codigo FROM items_metas', (err, results) => {
            if (err) return res.status(500).json({ success: false, message: err.message });

            const numerosUsados = results
                .map(r => {
                    if (r.codigo) {
                        const match = r.codigo.match(/\d+$/);
                        return match ? parseInt(match[0], 10) : null;
                    }
                    return null;
                })
                .filter(n => n !== null && n > 0)
                .sort((a, b) => a - b);

            let libre = 1;
            while (numerosUsados.includes(libre)) { libre++; }

            const numFormateado = String(libre).padStart(2, '0');
            const codigoGenerado = `MET-${anioActual}-${numFormateado}`;
            guardarItem(codigoGenerado);
        });
    } else {
        guardarItem(codigo);
    }
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

// --- CRUD TIPOS DE ATENCIÓN ---
app.get('/api/tipos-atencion', (req, res) => {
    db.query('SELECT * FROM tipos_atencion ORDER BY id_tipo ASC', (err, results) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, datos: results });
    });
});

app.post('/api/tipos-atencion', protegerRutaAdmin, (req, res) => {
    let { codigo, nombre, descripcion, delegacion, estado } = req.body;

    const guardarTipo = (codigoFinal) => {
        const query = `INSERT INTO tipos_atencion (codigo, nombre, descripcion, delegacion, estado) VALUES (?, ?, ?, ?, ?)`;
        db.query(query, [codigoFinal, nombre, descripcion || 'Sin descripción', delegacion || 'Todas (Comunal)', estado || 'ACTIVO'], (err, result) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true, id: result.insertId, codigo: codigoFinal });
        });
    };

    if (!codigo || String(codigo).trim() === '' || String(codigo).trim().toLowerCase().includes('auto')) {
        db.query('SELECT codigo FROM tipos_atencion', (err, results) => {
            if (err) return res.status(500).json({ success: false, message: err.message });

            const numerosUsados = results
                .map(r => {
                    if (r.codigo) {
                        const match = r.codigo.match(/\d+/);
                        return match ? parseInt(match[0], 10) : null;
                    }
                    return null;
                })
                .filter(n => n !== null && n > 0)
                .sort((a, b) => a - b);

            let libre = 1;
            while (numerosUsados.includes(libre)) { libre++; }

            const codigoGenerado = `TAT-${String(libre).padStart(2, '0')}`;
            guardarTipo(codigoGenerado);
        });
    } else {
        guardarTipo(codigo);
    }
});

app.put('/api/tipos-atencion/:id', protegerRutaAdmin, (req, res) => {
    const { id } = req.params;
    const { codigo, nombre, descripcion, delegacion, estado } = req.body;
    const query = `UPDATE tipos_atencion SET codigo=?, nombre=?, descripcion=?, delegacion=?, estado=? WHERE id_tipo=?`;
    db.query(query, [codigo, nombre, descripcion, delegacion || 'Todas (Comunal)', estado, id], (err) => {
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
                    message: `No se puede eliminar: Existen ${totalSub} Sub Atención(es) y ${totalAtenciones} Atención(es) asociadas.` 
                });
            }

            db.query('DELETE FROM tipos_atencion WHERE id_tipo = ?', [id], (errDel) => {
                if (errDel) return res.status(500).json({ success: false, message: errDel.message });
                res.json({ success: true });
            });
        });
    });
});

// --- CRUD SUB ATENCIONES ---
app.get('/api/sub-atenciones', (req, res) => {
    db.query('SELECT * FROM sub_atenciones ORDER BY id_sub ASC', (err, results) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, datos: results });
    });
});

app.post('/api/sub-atenciones', protegerRutaAdmin, (req, res) => {
    const { codigo, nombre, id_tipo_atencion, tipo_asociado, estado } = req.body;

    const procesarInsercion = (tipoNom, codigoPadre) => {
        const guardarSub = (codigoFinal) => {
            const query = `INSERT INTO sub_atenciones (codigo, nombre, tipo_asociado, estado) VALUES (?, ?, ?, ?)`;
            db.query(query, [codigoFinal, nombre, tipoNom, estado || 'ACTIVO'], (err, result) => {
                if (err) return res.status(500).json({ success: false, message: err.message });
                res.json({ success: true, id: result.insertId, codigo: codigoFinal });
            });
        };

        if (!codigo || String(codigo).trim() === '' || String(codigo).trim().toLowerCase().includes('auto')) {
            db.query('SELECT codigo FROM sub_atenciones WHERE tipo_asociado = ?', [tipoNom], (errSub, resultsSub) => {
                if (errSub) return res.status(500).json({ success: false, message: errSub.message });

                const matchPadre = (codigoPadre || '').match(/\d+/);
                const prefixPadre = matchPadre ? matchPadre[0].padStart(2, '0') : '01';

                const numerosSub = resultsSub
                    .map(r => {
                        if (r.codigo && r.codigo.length >= 2) {
                            const ultimosDos = r.codigo.slice(-2);
                            const num = parseInt(ultimosDos, 10);
                            return isNaN(num) ? null : num;
                        }
                        return null;
                    })
                    .filter(n => n !== null && n > 0)
                    .sort((a, b) => a - b);

                let libre = 1;
                while (numerosSub.includes(libre)) { libre++; }

                const subNumFormatted = String(libre).padStart(2, '0');
                const codigoGenerado = `SAT-${prefixPadre}${subNumFormatted}`;
                guardarSub(codigoGenerado);
            });
        } else {
            guardarSub(codigo);
        }
    };

    if (id_tipo_atencion) {
        db.query('SELECT nombre, codigo FROM tipos_atencion WHERE id_tipo = ?', [id_tipo_atencion], (err, resTipo) => {
            let tipoNom = tipo_asociado || 'General';
            let codigoPadre = 'TAT-01';
            if (!err && resTipo.length > 0) {
                tipoNom = resTipo[0].nombre;
                codigoPadre = resTipo[0].codigo;
            }
            procesarInsercion(tipoNom, codigoPadre);
        });
    } else {
        procesarInsercion(tipo_asociado || 'General', 'TAT-01');
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

// --- CRUD ATENCIONES (GESTIÓN TERRITORIAL) ---
app.get('/api/atenciones', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const delegacion = req.query.delegacion || '';

    let query = 'SELECT SQL_CALC_FOUND_ROWS * FROM atenciones WHERE 1=1';
    let params = [];

    if (search) {
        query += ' AND (rut LIKE ? OR solicitante LIKE ? OR tipo_atencion LIKE ? OR sub_atencion LIKE ? OR usuario_responsable LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (delegacion && !delegacion.includes('Todas')) {
        query += ' AND delegacion LIKE ?';
        params.push(`%${delegacion}%`);
    }

    query += ' ORDER BY id_atencion DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    db.query(query, params, (err, results) => {
        if (err) return res.status(500).json({ success: false, message: err.message });

        db.query('SELECT FOUND_ROWS() as total', (errTotal, totalRes) => {
            if (errTotal) return res.status(500).json({ success: false, message: errTotal.message });
            const total = totalRes[0].total;

            res.json({ 
                success: true, 
                datos: results,
                paginacion: {
                    totalRegistros: total,
                    totalPaginas: Math.ceil(total / limit) || 1,
                    paginaActual: page,
                    limite: limit
                }
            });
        });
    });
});

app.post('/api/atenciones', (req, res) => {
    const { rut, solicitante, delegacion, usuario_responsable, tipo_atencion, sub_atencion, descripcion, estado } = req.body;

    const query = `INSERT INTO atenciones (rut, solicitante, delegacion, usuario_responsable, tipo_atencion, sub_atencion, descripcion, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.query(query, [
        rut, 
        solicitante, 
        delegacion || 'Sector Centro', 
        usuario_responsable || 'Funcionario General', 
        tipo_atencion, 
        sub_atencion, 
        descripcion || '', 
        estado || 'PENDIENTE'
    ], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, id: result.insertId });
    });
});

app.put('/api/atenciones/:id', (req, res) => {
    const { id } = req.params;
    const { rut, solicitante, delegacion, usuario_responsable, tipo_atencion, sub_atencion, descripcion, estado } = req.body;

    const query = `
        UPDATE atenciones 
        SET rut=?, solicitante=?, delegacion=?, usuario_responsable=?, tipo_atencion=?, sub_atencion=?, descripcion=?, estado=? 
        WHERE id_atencion=?
    `;
    
    db.query(query, [rut, solicitante, delegacion, usuario_responsable, tipo_atencion, sub_atencion, descripcion, estado || 'PENDIENTE', id], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: 'Atención actualizada correctamente.' });
    });
});

app.delete('/api/atenciones/:id', protegerRutaAdmin, (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM atenciones WHERE id_atencion = ?', [id], (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: 'Atención eliminada con éxito.' });
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
});