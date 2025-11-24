// logic/script.js

const searchInput = document.getElementById('searchInput');
const resultsContainer = document.getElementById('resultsContainer');
const TARIFF_FILE = 'Tarifa_Grandes_Cuentas.json'; 

let allProducts = [];
let stockMap = new Map();

// --- UTILIDADES ---
function extractMinQty(text) {
    if (!text || typeof text !== 'string') return 0;
    const match = text.toLowerCase().match(/(\d+)\s*(uds?|unid|pzs?|pza|cjs?)/);
    if (match) return parseInt(match[1]);
    return 0;
}

function extractNetPrice(text) {
    if (!text || typeof text !== 'string') return 0;
    let match = text.match(/(\d+[.,]?\d*)\s*€/);
    if (match) return parseFloat(match[1].replace(',', '.'));
    return 0;
}

// --- CARGA DE DATOS ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. Stock
        const stockRes = await fetch(`src/Stock.json?v=${Date.now()}`);
        const stockData = await stockRes.json();
        (stockData.Stock || []).forEach(item => stockMap.set(String(item.Artículo), item));

        // 2. Tarifa
        const tariffRes = await fetch(`src/${TARIFF_FILE}?v=${Date.now()}`);
        const tariffData = await tariffRes.json();
        const sheetName = Object.keys(tariffData)[0];
        allProducts = tariffData[sheetName];

        console.log("Datos cargados.");
    } catch (error) {
        resultsContainer.innerHTML = '<p>Error cargando datos.</p>';
        console.error(error);
    }
});

// --- BÚSQUEDA ---
searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    if (query.length < 2) {
        resultsContainer.innerHTML = '';
        return;
    }

    const filtered = allProducts.filter(p => {
        const desc = p.Descripcion ? p.Descripcion.toLowerCase() : '';
        const ref = p.Referencia ? String(p.Referencia).toLowerCase() : '';
        const stockInfo = stockMap.get(String(p.Referencia));
        if (stockInfo && stockInfo.Estado === 'no') return false;
        return desc.includes(query) || ref.includes(query);
    });
    displayResults(filtered);
});

// --- RENDERIZADO ---
function displayResults(products) {
    if (!products.length) {
        resultsContainer.innerHTML = '<p style="text-align:center">No hay resultados.</p>';
        return;
    }

    let html = '';
    products.forEach((p, idx) => {
        // Precios
        let precioNum = p.PRECIO_ESTANDAR || 0;
        let netoTxt = p.NETOS_GRANDE_CUENTAS ? p.CONDICION_NETO_GC : 'No aplica';
        
        // Stock
        const sInfo = stockMap.get(String(p.Referencia));
        let sHtml = '', sTxt = 'Consultar';
        if (sInfo) {
            if (sInfo.Estado === 'si') {
                sHtml = sInfo.Stock > 0 ? '<div class="stock-badge stock-ok">✅ En stock</div>' : '<div class="stock-badge stock-ko">❌ Sin stock</div>';
                sTxt = sInfo.Stock > 0 ? "En stock" : "Sin stock";
            } else if (sInfo.Estado === 'fab') {
                sHtml = '<div class="stock-badge stock-fab">🏭 3-5 días</div>';
                sTxt = "3-5 días";
            }
        }

        // Datos seguros
        const safeRef = String(p.Referencia).replace(/["']/g, "");
        const safeDesc = String(p.Descripcion).replace(/["']/g, "");
        const safeNeto = String(netoTxt).replace(/["']/g, "");
        const safeStock = String(sTxt).replace(/["']/g, "");
        const minQty = extractMinQty(netoTxt);
        const netVal = extractNetPrice(netoTxt);
        const qtyId = `qty_${idx}`;

        html += `
            <div class="product-card-single">
                <div class="card-header">
                    <div><h2>${p.Descripcion}</h2><p class="ref-text">Ref: ${p.Referencia}</p></div>
                    ${sHtml}
                </div>
                <div class="price-details-grid">
                    <p class="price-line"><strong>Precio:</strong> <span class="final-price">${precioNum.toFixed(2)} €</span></p>
                    <p class="price-line"><strong>Neto Esp:</strong> <span class="neto-price">${netoTxt}</span></p>
                </div>
                <div class="add-controls">
                    <input type="number" id="${qtyId}" class="qty-input" value="1" min="1">
                    <button class="add-budget-btn" 
                        onclick="addToBudget('${safeRef}', '${safeDesc}', ${precioNum}, document.getElementById('${qtyId}').value, '${safeNeto}', ${minQty}, ${netVal}, '${safeStock}')">
                        + Añadir
                    </button>
                </div>
            </div>`;
    });
    resultsContainer.innerHTML = html;
}