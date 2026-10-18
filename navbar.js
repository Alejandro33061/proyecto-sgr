function cargarNavbarGlobal() {
    const navbarContainer = document.getElementById('navbar-container');
    if (!navbarContainer) return;

    fetch('navbar.html')
        .then(res => res.text())
        .then(html => {
            navbarContainer.innerHTML = html;
            marcarBotonActivoGlobal();
            sincronizarSesionYNavbarGlobal();
        })
        .catch(err => console.error('Error al cargar navbar.html:', err));
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cargarNavbarGlobal);
} else {
    cargarNavbarGlobal();
}

function marcarBotonActivoGlobal() {
    let paginaActual = window.location.pathname.split("/").pop();
    if (!paginaActual || paginaActual === '') paginaActual = 'dashboard.html';

    const enlaces = document.querySelectorAll('#navPublicMenu .nav-link-item');
    enlaces.forEach(enlace => {
        const href = enlace.getAttribute('href');
        if (href && paginaActual.includes(href)) {
            enlace.classList.add('activo-fijo');
        } else {
            enlace.classList.remove('activo-fijo');
        }
    });
}

async function sincronizarSesionYNavbarGlobal() {
    const API = window.location.protocol.startsWith('http') 
        ? `${window.location.origin}/api` 
        : 'http://localhost:3000/api';

    const paginaActual = window.location.pathname.split("/").pop();

    try {
        // Petición en tiempo real a MySQL sin caché y pasando credenciales
        const response = await fetch(`${API}/sesion-actual?t=${new Date().getTime()}`, {
            method: 'GET',
            credentials: 'include',
            headers: { 
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            }
        });

        if (!response.ok) {
            if (!paginaActual.includes('index.html') && !paginaActual.includes('recuperar.html')) {
                window.location.href = 'index.html';
            }
            return;
        }

        const data = await response.json();

        if (data.success && data.usuario) {
            const usr = data.usuario;

            // Actualizar almacenamiento local para compatibilidad
            localStorage.setItem('sgr_user', JSON.stringify(usr));

            // Actualizar elementos de la cabecera
            const elNombre = document.getElementById('usrHeaderNombre');
            const elRol = document.getElementById('usrHeaderRol');
            const elDelegacion = document.getElementById('usrHeaderDelegacion');

            if (elNombre) elNombre.textContent = usr.nombre || usr.nombre_usuario;
            if (elRol) elRol.textContent = usr.rol;
            if (elDelegacion) elDelegacion.textContent = usr.delegacion || 'DEL-001 | Sector Centro';

            // Evaluación de permisos RBAC
            const rolLower = (usr.rol || '').trim().toLowerCase();
            const esAdmin = rolLower.includes('admin') || rolLower.includes('coordinador');

            const modulosPrivados = ['nav-delegaciones', 'nav-roles', 'nav-usuarios', 'nav-items'];
            const paginasProhibidas = ['usuarios.html', 'roles.html', 'delegaciones.html', 'items.html'];

            if (!esAdmin) {
                // Ocultar pestañas de administración
                modulosPrivados.forEach(id => {
                    const item = document.getElementById(id);
                    if (item) item.style.display = 'none';
                });

                // Redirigir fuera si intenta forzar la URL
                if (paginasProhibidas.some(p => paginaActual.includes(p))) {
                    window.location.href = 'dashboard.html';
                }
            } else {
                // Mostrar todas las pestañas para Administradores y Coordinadores
                modulosPrivados.forEach(id => {
                    const item = document.getElementById(id);
                    if (item) item.style.display = 'block';
                });
            }
        } else {
            if (!paginaActual.includes('index.html') && !paginaActual.includes('recuperar.html')) {
                window.location.href = 'index.html';
            }
        }
    } catch (error) {
        console.error('❌ Error al sincronizar sesión:', error);
    }
}

async function cerrarSesion() {
    const API = window.location.protocol.startsWith('http') 
        ? `${window.location.origin}/api` 
        : 'http://localhost:3000/api';

    try {
        await fetch(`${API}/logout`, { method: 'POST', credentials: 'include' });
    } catch (e) {
        console.error(e);
    }
    localStorage.removeItem('sgr_user');
    sessionStorage.removeItem('sgr_user');
    window.location.href = 'index.html';
}