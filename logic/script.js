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
    return match ? parseInt(match[1]) : 0;
}

function extractNetPrice(text) {
    if (!text || typeof text !== 'string') return 0;
    let match = text.match(/(\d+[.,]?\d*)\s*€/);
    return match ? parseFloat(match[1].replace(',', '.')) : 0;
}

// --- CARGA ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const [stockRes, tariffRes] = await Promise.all([
            fetch(`src/Stock.json?v=${Date.now()}`),
            fetch(`src/${TARIFF_FILE}?v=${Date.now()}`)
        ]);

        const stockData = await stockRes.json();
        (stockData.Stock || []).forEach(i => stockMap.set(String(i.Artículo), i));

        const tariffData = await tariffRes.json();
        const sheet = Object.keys(tariffData)[0];
        allProducts = tariffData[sheet];

        console.log("Sistema listo.");
    } catch (error) {
        resultsContainer.innerHTML = '<p style="text-align:center; color:red;">Error cargando datos.</p>';
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
        const stock = stockMap.get(String(p.Referencia));
        if (stock && stock.Estado === 'no') return false;
        return desc.includes(query) || ref.includes(query);
    });
    displayResults(filtered);
});

// --- RENDER ---
function displayResults(products) {
    if (!products.length) {
        resultsContainer.innerHTML = '<p style="text-align:center">No hay resultados.</p>';
        return;
    }

    let html = '';
    products.forEach((p, idx) => {
        const precio = p.PRECIO_ESTANDAR || 0;
        const netoTxt = p.NETOS_GRANDE_CUENTAS ? p.CONDICION_NETO_GC : 'No aplica';
        
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

        // Sanitizar comillas para evitar bugs en el HTML
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
                    <p class="price-line"><strong>Precio:</strong> <span class="final-price">${precio.toFixed(2)} €</span></p>
                    <p class="price-line"><strong>Neto Esp:</strong> <span class="neto-price">${netoTxt}</span></p>
                </div>
                <div class="add-controls">
                    <input type="number" id="${qtyId}" class="qty-input" value="1" min="1">
                    <button class="add-budget-btn" 
                        onclick="addToBudget('${safeRef}', '${safeDesc}', ${precio}, document.getElementById('${qtyId}').value, '${safeNeto}', ${minQty}, ${netVal}, '${safeStock}')">
                        + Añadir
                    </button>
                </div>
            </div>`;
    });
    resultsContainer.innerHTML = html;
}