# 🏛️ Sistema de Gestión de Requerimientos (SGR)
**Ilustre Municipalidad de La Serena**

Sistema web unificado para el registro, derivación, seguimiento y control de atenciones ciudadanas y requerimientos en las distintas delegaciones territoriales de la Comuna de La Serena.

* **Repositorio Git Oficial:** https://github.com/Alejandro33061/proyecto-sgr

---

## 👥 Integrantes del Equipo
* Integrantes del proyecto SGR
 Javier Enrique Pérez González
 Alejandro Cantillanes
 Joaquín Alonso Galleguillos Gallardo
---

## 🛠️ Arquitectura y Tecnologías
* **Frontend:** HTML5, CSS3, JavaScript (ES6+), Bootstrap 5, SweetAlert2.
* **Backend:** Node.js, Express.js.
* **Base de Datos:** MySQL / phpMyAdmin (sgr_laserena).
* **Control de Versiones & Despliegue:** Git, GitHub, AWS EC2.

---

## 📊 Matriz de Estado de Módulos (Segunda Evaluación)

| Módulo / Componente | Estado Funcional | Cobertura y Descripción |

| **Login & Autenticación**     | Validación de credenciales por usuario/correo y contraseña, gestión de sesión por rol. |
| **Recuperación de Contraseña**| Flujo en 3 pasos: Solicitud, validación de código dinámico con temporizador y cambio de clave (recuperar.html). |
| **CRUD Delegaciones**         | Alta, baja, edición, listado, paginación, filtros y exportación CSV en MySQL. |
| **CRUD Roles**                | Gestión completa de roles, permisos asociados y alcances. |
| **CRUD Usuarios**             | Registro y edición de usuarios con asignación de delegaciones y perfiles de acceso. |
| **CRUD Ítems y Metas**        | Mantenedor completo de catálogo de ítems y metas operativas. |
| **CRUD Tipo de Atención**     | Gestión de categorías principales con validación de integridad referencial. |
| **CRUD Sub Atención**         | Vinculación a Tipo de Atención y validación de integridad referencial antes de borrar. |
| **Ingreso de Atención**       | Asignación automática de delegación activa, usuario responsable, fecha y catálogo dependiente. |


## 🚀 Instalación, Configuración y Arranque del Servidor

### Pasos de Instalación y Arranque

1. Clonar el repositorio:
git clone https://github.com/Alejandro33061/proyecto-sgr.git
cd proyecto-sgr

2. Instalar dependencias del proyecto:
npm install

3. Arrancar el servidor Node.js:
node server.js

*Al ejecutar "node server.js", el servidor inicializará automáticamente la base de datos sgr_laserena, creará las tablas necesarias e insertará los datos semilla iniciales.*

4. Acceso a la Aplicación:
Abre tu navegador e ingresa a: http://localhost:3000

## ☁️ Configuración y Despliegue en AWS (EC2)

1. Instancia EC2: Ubuntu Server / Amazon Linux.
2. Puertos Abiertos (Security Groups): Custom TCP (3000), HTTP (80), SSH (22).
3. Instalación y Arranque en la Nube:
git clone https://github.com/Alejandro33061/proyecto-sgr.git
cd proyecto-sgr
npm install
node server.js


4. URL de Producción en AWS: 
   http://54.157.1.227:3000

   php: http://54.157.1.227:8080

---

## 🔐 Credenciales de Prueba para Evaluación

| Rol | Usuario / Correo | Contraseña | Alcance / Permisos |
| :--- | :--- | :--- | :--- |
| **Administrador** | admin@laserena.cl | admin1234 | Acceso comunal total a todos los mantenedores y configuraciones. |
| **Delegado Territorial** | alan.vk@laserena.cl | Delegado1234 | Gestión del contexto de su delegación asignada (Sector Centro). |