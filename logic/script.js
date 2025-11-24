// logic/script.js

const searchInput = document.getElementById('searchInput');
const resultsContainer = document.getElementById('resultsContainer');

// CONFIGURACIÓN FIJA PARA CLIENTE
const TARIFF_FILE = 'Tarifa_Grandes_Cuentas.json'; 

let allProducts = [];
let stockMap = new Map();

// 1. UTILIDADES DE TEXTO
function extractMinQty(text) {
    if (!text || typeof text !== 'string') return 0;
    const t = text.toLowerCase();
    const qtyRegex = /(\d+)\s*(uds?|unid|pzs?|pza|cjs?|cajas?)/;
    let match = t.match(qtyRegex);
    if (match) return parseInt(match[1]);
    const simpleNumRegex = /\b(\d{2,})\b/; 
    match = t.match(simpleNumRegex);
    if (match) return parseInt(match[0]);
    return 0;
}

function extractNetPrice(text) {
    if (!text || typeof text !== 'string') return 0;
    let match = text.match(/(\d+[.,]?\d*)\s*€/);
    if (match) return parseFloat(match[1].replace(',', '.'));
    match = text.match(/neto\s*:?\s*(\d+[.,]?\d*)/i);
    if (match) return parseFloat(match[1].replace(',', '.'));
    return 0;
}

// 2. CARGA DE DATOS
async function loadData() {
    try {
        // Cargar Stock
        const stockRes = await fetch(`src/Stock.json?v=${new Date().getTime()}`);
        const stockData = await stockRes.json();
        (stockData.Stock || []).forEach(item => stockMap.set(String(item.Artículo), item));

        // Cargar Tarifa Única
        searchInput.placeholder = 'Cargando catálogo...';
        const tariffRes = await fetch(`src/${TARIFF_FILE}?v=${new Date().getTime()}`);
        const tariffData = await tariffRes.json();
        const sheetName = Object.keys(tariffData)[0]; 
        allProducts = tariffData[sheetName];

        searchInput.placeholder = 'Buscar por referencia o descripción...';
        console.log("Datos cargados correctamente.");

    } catch (error) {
        searchInput.placeholder = 'Error al cargar datos.';
        console.error('Error:', error);
        resultsContainer.innerHTML = '<p class="error">Error de conexión con la base de datos.</p>';
    }
}

document.addEventListener('DOMContentLoaded', loadData);

// 3. BÚSQUEDA
searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    if (query.length < 2) {
        resultsContainer.innerHTML = '';
        return;
    }

    const filtered = allProducts.filter(p => {
        const desc = p.Descripcion ? p.Descripcion.toLowerCase() : '';
        const ref = p.Referencia ? String(p.Referencia).toLowerCase() : '';
        
        // Opcional: Ocultar si stock es "no" definitivamente, o mostrarlo.
        const stockInfo = stockMap.get(String(p.Referencia));
        if (stockInfo && stockInfo.Estado === 'no') return false;

        return desc.includes(query) || ref.includes(query);
    });

    displayResults(filtered);
});

// 4. RENDERIZADO (Específico Grandes Cuentas)
function displayResults(products) {
    if (products.length === 0) {
        resultsContainer.innerHTML = '<p style="text-align:center">No se encontraron productos.</p>';
        return;
    }

    let html = '';
    products.forEach((product, index) => {
        // Lógica de Precios Grandes Cuentas
        let precioFinalNumerico = product.PRECIO_ESTANDAR || 0;
        let precioNetoTexto = 'No aplica';

        if (product.NETOS_GRANDE_CUENTAS) {
            precioNetoTexto = product.CONDICION_NETO_GC;
        }

        const precioMostrar = precioFinalNumerico.toFixed(2);

        // Lógica de Stock
        const stockInfo = stockMap.get(String(product.Referencia));
        let stockHtml = '';
        let stockText = 'Consultar';

        if (stockInfo) {
            const estado = stockInfo.Estado ? stockInfo.Estado.toLowerCase() : '';
            const cantidad = stockInfo.Stock || 0;
            
            if (estado === 'si') {
                stockHtml = cantidad > 0 
                    ? `<div class="stock-badge stock-ok">✅ En stock</div>`
                    : `<div class="stock-badge stock-ko">❌ Sin stock</div>`;
                stockText = cantidad > 0 ? "En stock" : "Sin stock";
            } else if (estado === 'fab') {
                stockHtml = `<div class="stock-badge stock-fab">🏭 3-5 días</div>`;
                stockText = "3-5 días";
            } else if (estado === 'fab2') {
                stockHtml = `<div class="stock-badge stock-fab">🏭 10-15 días</div>`;
                stockText = "10-15 días";
            }
        }

        // Sanitización para JS
        const safeRef = String(product.Referencia || '').replace(/["']/g, "");
        const safeDesc = String(product.Descripcion || '').replace(/["']/g, "");
        const safeNetoTxt = String(precioNetoTexto).replace(/["']/g, "");
        const safeStockTxt = String(stockText).replace(/["']/g, "");
        
        const minQty = extractMinQty(precioNetoTexto);
        const netPriceVal = extractNetPrice(precioNetoTexto);
        const qtyId = `qty_${index}`;

        html += `
            <div class="product-card-single">
                <div class="card-header">
                    <div>
                        <h2>${product.Descripcion}</h2>
                        <p class="ref-text">Ref: ${product.Referencia}</p>
                    </div>
                    ${stockHtml}
                </div>
                
                <div class="price-details-grid">
                    <p class="price-line"><strong>Tu Precio:</strong> <span class="final-price">${precioMostrar} €</span></p>
                    <p class="price-line"><strong>Neto Especial:</strong> <span class="neto-price">${precioNetoTexto}</span></p>
                </div>

                <div class="add-controls">
                    <input type="number" id="${qtyId}" class="qty-input" value="1" min="1">
                    <button class="add-budget-btn" 
                        onclick="addToBudget('${safeRef}', '${safeDesc}', ${precioFinalNumerico}, document.getElementById('${qtyId}').value, '${safeNetoTxt}', ${minQty}, ${netPriceVal}, '${safeStockTxt}')">
                        + Añadir
                    </button>
                </div>
            </div>`;
    });
    resultsContainer.innerHTML = html;
}