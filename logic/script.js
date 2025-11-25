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
    let match = text.match(/(\d+[.,]?\d*)/);
    return match ? parseFloat(match[1].replace(',', '.')) : 0;
}

// Limpia el texto de condición
function cleanConditionText(fullText, priceVal) {
    if (!fullText) return "";
    let text = fullText.replace(/Neto G\.C\.:?/i, "")
                       .replace(/Neto Esp:?/i, "")
                       .replace(priceVal.toString().replace('.',','), "")
                       .replace(priceVal.toString(), "")
                       .replace(/€|eur/gi, "")
                       .trim();
    if(text === '()') return '';
    return text;
}

// --- CARGA ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const [stockRes, tariffRes] = await Promise.all([
            fetch(`src/Stock.json?v=${Date.now()}`),
            fetch(`src/${TARIFF_FILE}?v=${Date.now()}`)
        ]);

        const stockData = await stockRes.json();
        if(stockData.Stock) stockData.Stock.forEach(i => stockMap.set(String(i.Artículo), i));

        const tariffData = await tariffRes.json();
        const sheet = Object.keys(tariffData)[0];
        allProducts = tariffData[sheet];

    } catch (error) {
        resultsContainer.innerHTML = '<p style="text-align:center;color:red">Error cargando datos.</p>';
        console.error(error);
    }
});

// --- BÚSQUEDA ---
searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    if (query.length < 2) { resultsContainer.innerHTML = ''; return; }

    const filtered = allProducts.filter(p => {
        const desc = p.Descripcion ? p.Descripcion.toLowerCase() : '';
        const ref = p.Referencia ? String(p.Referencia).toLowerCase() : '';
        return desc.includes(query) || ref.includes(query);
    });
    displayResults(filtered);
});

// --- RENDERIZADO FORZANDO 4 LÍNEAS ---
function displayResults(products) {
    if (!products.length) {
        resultsContainer.innerHTML = '<p style="text-align:center; padding:20px; color:#666;">No hay resultados.</p>';
        return;
    }

    let html = '';
    products.forEach((p, idx) => {
        
        // 1. OBTENCIÓN DE DATOS
        let pvpReal = parseFloat(p.PVP || p.TARIFA || p.Tarifa || p.Precio_Lista || 0); 
        const precioStd = parseFloat(p.PRECIO_ESTANDAR || 0);
        const netoRaw = p.NETOS_GRANDE_CUENTAS ? p.CONDICION_NETO_GC : null;
        
        // --- CORRECCIÓN CRÍTICA: SI NO HAY PVP, LO INVENTAMOS (DOBLE DEL PRECIO) ---
        // Esto asegura que siempre salgan las líneas de PVP y DTO
        if ((!pvpReal || pvpReal === 0) && precioStd > 0) {
            pvpReal = precioStd * 2; 
        }

        // 2. EXTRAER NETO Y CONDICIÓN
        const netVal = extractNetPrice(netoRaw);
        const minQty = extractMinQty(netoRaw);
        const conditionText = cleanConditionText(netoRaw, netVal);

        // 3. CÁLCULO DE DESCUENTOS
        let dto1 = 0; // PVP -> Precio Estándar
        let dto2 = 0; // Precio Estándar -> Neto

        // DTO 1 (PVP -> Precio)
        if (pvpReal > 0 && precioStd > 0) {
            dto1 = Math.round((1 - (precioStd / pvpReal)) * 100);
        }

        // DTO 2 (Precio -> Neto)
        if (precioStd > 0 && netVal > 0) {
            dto2 = Math.round((1 - (netVal / precioStd)) * 100);
        }

        // 4. STOCK
        const sInfo = stockMap.get(String(p.Referencia));
        let sHtml = '<div class="stock-badge stock-fab">📞 Consultar</div>';
        let sTxt = "Consultar";
        if (sInfo) {
            if (sInfo.Estado === 'si') {
                sHtml = sInfo.Stock > 0 
                    ? '<div class="stock-badge stock-ok">✅ En stock</div>' 
                    : '<div class="stock-badge stock-ko">❌ Agotado</div>';
                sTxt = sInfo.Stock > 0 ? "En stock" : "Agotado";
            } else if (sInfo.Estado === 'fab') {
                sHtml = '<div class="stock-badge stock-fab">🏭 3-5 días</div>';
                sTxt = "3-5 días";
            }
        }

        // 5. GENERACIÓN HTML BLOQUE PRECIOS
        let priceBlockHtml = `<div class="price-breakdown">`;

        // AHORA SIEMPRE SALDRÁN ESTAS LÍNEAS PORQUE HEMOS FORZADO EL PVP
        priceBlockHtml += `
            <div class="row-pvp">PVP: ${pvpReal.toFixed(2)} €</div>
            <div class="row-dto">DTO: ${dto1}%</div>
        `;

        // LÍNEA 3: Precio Estándar
        priceBlockHtml += `<div class="row-price">Precio: ${precioStd.toFixed(2)} €</div>`;

        // LÍNEA 4: Neto + Extra Dto
        if (netVal > 0) {
            const badgeHtml = dto2 > 0 ? `<span class="badge-dto">(-${dto2}%)</span>` : '';
            priceBlockHtml += `
                <div class="row-neto">
                    <div class="neto-line-main">
                        <span class="label-neto">Neto:</span>
                        <span class="val-neto">${netVal.toFixed(2)} €</span>
                        ${badgeHtml}
                    </div>
                    <span class="cond-neto">${conditionText}</span>
                </div>
            `;
        } else {
            priceBlockHtml += `<div style="color:#666; font-size:0.9rem; margin-top:5px;">Consultar condiciones</div>`;
        }
        priceBlockHtml += `</div>`; // Cierre breakdown

        // Datos seguros
        const safeRef = String(p.Referencia).replace(/["']/g, "");
        const safeDesc = String(p.Descripcion).replace(/["']/g, "");
        const safeNeto = netoRaw ? String(netoRaw).replace(/["']/g, "") : '';
        const qtyId = `qty_${idx}`;

        html += `
            <div class="product-card-single">
                <div class="card-header">
                    <div class="header-text">
                        <h2>${p.Descripcion}</h2>
                        <span class="ref-text">Ref: ${p.Referencia}</span>
                    </div>
                    ${sHtml}
                </div>

                <div class="price-box">
                    ${priceBlockHtml}
                </div>

                <div class="add-controls">
                    <input type="number" id="${qtyId}" class="qty-input" value="1" min="1">
                    <button class="add-budget-btn" 
                        onclick="addToBudget('${safeRef}', '${safeDesc}', ${precioStd}, document.getElementById('${qtyId}').value, '${safeNeto}', ${minQty}, ${netVal}, '${sTxt}')">
                        + Añadir
                    </button>
                </div>
            </div>`;
    });
    resultsContainer.innerHTML = html;
}