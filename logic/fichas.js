// Apuntamos al archivo local de fichas técnicas
const DATA_FILE = 'src/Fichas_Tecnicas.json';

const searchInput = document.getElementById('searchInput');
const resultsContainer = document.getElementById('resultsContainer');

let allTechSheets = [];

// Cargar los datos al iniciar la página
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch(`${DATA_FILE}?v=${new Date().getTime()}`);
        if (!response.ok) throw new Error(`HTTP error! Estado: ${response.status}`);
        const dataObject = await response.json();
        if (dataObject && dataObject.Fichas_Tecnicas) {
            allTechSheets = dataObject.Fichas_Tecnicas;
            searchInput.placeholder = "Buscar por referencia o descripción...";
        } else {
            throw new Error("El formato del archivo JSON no es correcto.");
        }
    } catch (error) {
        searchInput.placeholder = "Error al cargar las fichas técnicas.";
        console.error('Error fetching data:', error);
    }
});

// Evento de búsqueda
searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    if (query.length < 2) {
        resultsContainer.innerHTML = '';
        return;
    }
    const filteredResults = allTechSheets.filter(item => {
        const descripcion = item.Descripcion ? item.Descripcion.toLowerCase() : '';
        const referencia = item.Referencia ? item.Referencia.toString().toLowerCase() : '';
        return descripcion.includes(query) || referencia.includes(query);
    });
    displayResults(filteredResults);
});

// --- FUNCIÓN PARA EXTRAER EL ID DE CUALQUIER ENLACE DE GOOGLE DRIVE ---
function getDriveIdFromUrl(url) {
    if (!url) return null;
    // Expresión regular para encontrar el ID en diferentes formatos de URL de Drive
    const match = url.match(/[-\w]{25,}/);
    return match ? match[0] : null;
}

// Función para mostrar los resultados en pantalla
function displayResults(results) {
    if (results.length === 0) {
        resultsContainer.innerHTML = '<p style="text-align: center; color: var(--subtle-text);">No se encontraron fichas técnicas.</p>';
        return;
    }

    const iconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>`;
    let html = '';
    
    results.forEach(item => {
        const originalUrl = item['Ficha Tecnica'];
        const fileId = getDriveIdFromUrl(originalUrl);
        // Construimos el enlace de descarga directa, que es el más fiable
        const downloadUrl = fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : null;

        html += `
            <div class="tech-sheet-card">
                <h2>${item.Descripcion || 'Sin descripción'}</h2>
                <div class="tech-sheet-info">
                    <p><strong>Referencia:</strong> ${item.Referencia || 'N/A'}</p>
                    <p><strong>PVP:</strong> ${(item.PVP || 0).toFixed(2)} €</p>
                    <p><strong>EAN13:</strong> ${item.EAN13 || 'N/A'}</p>
                </div>
                ${downloadUrl ? `
                <a href="${downloadUrl}" class="tech-sheet-button" target="_blank">
                    ${iconSVG}
                    <span>Descargar Ficha Técnica</span>
                </a>` : '<p class="tech-sheet-status">Enlace de ficha no válido.</p>'}
            </div>
        `;
    });

    resultsContainer.innerHTML = html;
}