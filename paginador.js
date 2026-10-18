/**
 * Paginador genérico para mantenedores del SGR
 */
class PaginadorTabla {
    constructor({ datos, renderRow, tbodyId, infoPaginacionId, contenedorPaginadorId, registrosPorPagina = 5 }) {
        this.datosOriginales = datos;
        this.datosFiltrados = [...datos];
        this.renderRow = renderRow;
        this.tbody = document.getElementById(tbodyId);
        this.infoPaginacion = document.getElementById(infoPaginacionId);
        this.contenedorPaginador = document.getElementById(contenedorPaginadorId);
        this.registrosPorPagina = registrosPorPagina;
        this.paginaActual = 1;
    }

    actualizarDatos(nuevosDatos) {
        this.datosOriginales = nuevosDatos;
        this.datosFiltrados = [...nuevosDatos];
        this.paginaActual = 1;
        this.render();
    }

    filtrar(busquedaTexto = '', estadoFiltro = '', campos = []) {
        const texto = busquedaTexto.toLowerCase().trim();
        const estado = estadoFiltro.toUpperCase().trim();

        this.datosFiltrados = this.datosOriginales.filter(item => {
            const coincideTexto = texto === '' || campos.some(campo => {
                const valor = (item[campo] || '').toString().toLowerCase();
                return valor.includes(texto);
            });

            const estadoItem = (item.estado || item.estado_registro || '').toUpperCase();
            const coincideEstado = estado === '' || estadoItem === estado;

            return coincideTexto && coincideEstado;
        });

        this.paginaActual = 1;
        this.render();
    }

    render() {
        if (!this.tbody) return;
        this.tbody.innerHTML = '';

        const totalRegistros = this.datosFiltrados.length;
        if (totalRegistros === 0) {
            this.tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-4">No se encontraron registros coincidentes.</td></tr>`;
            if (this.infoPaginacion) this.infoPaginacion.textContent = 'Mostrando 0 a 0 de 0 registros';
            if (this.contenedorPaginador) this.contenedorPaginador.innerHTML = '';
            return;
        }

        const totalPaginas = Math.ceil(totalRegistros / this.registrosPorPagina);
        if (this.paginaActual > totalPaginas) this.paginaActual = totalPaginas;

        const inicio = (this.paginaActual - 1) * this.registrosPorPagina;
        const fin = Math.min(inicio + this.registrosPorPagina, totalRegistros);

        const paginaDatos = this.datosFiltrados.slice(inicio, fin);
        paginaDatos.forEach(item => {
            const tr = this.renderRow(item);
            this.tbody.appendChild(tr);
        });

        if (this.infoPaginacion) {
            this.infoPaginacion.textContent = `Mostrando ${inicio + 1} a ${fin} de ${totalRegistros} registros`;
        }

        this.renderControlesPaginacion(totalPaginas);
    }

    renderControlesPaginacion(totalPaginas) {
        if (!this.contenedorPaginador) return;

        let html = `<ul class="pagination pagination-sm m-0 justify-content-end">`;

        // Botón Anterior
        html += `
            <li class="page-item ${this.paginaActual === 1 ? 'disabled' : ''}">
                <button class="page-link" onclick="window.paginadorInstancia.irAPagina(${this.paginaActual - 1})">Anterior</button>
            </li>
        `;

        // Números de Página
        for (let i = 1; i <= totalPaginas; i++) {
            html += `
                <li class="page-item ${i === this.paginaActual ? 'active' : ''}">
                    <button class="page-link ${i === this.paginaActual ? 'style="background-color: #8B1E28; border-color: #8B1E28;"' : ''}" onclick="window.paginadorInstancia.irAPagina(${i})">${i}</button>
                </li>
            `;
        }

        // Botón Siguiente
        html += `
            <li class="page-item ${this.paginaActual === totalPaginas ? 'disabled' : ''}">
                <button class="page-link" onclick="window.paginadorInstancia.irAPagina(${this.paginaActual + 1})">Siguiente</button>
            </li>
        </ul>`;

        this.contenedorPaginador.innerHTML = html;
        window.paginadorInstancia = this;
    }

    irAPagina(num) {
        this.paginaActual = num;
        this.render();
    }
}