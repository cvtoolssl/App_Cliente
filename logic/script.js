// logic/script.js

const searchInput = document.getElementById('searchInput');
const resultsContainer = document.getElementById('resultsContainer');
const TARIFF_FILE = 'Tarifa_Grandes_Cuentas.json'; 
const PHOTOS_FILE = 'Foto_Articulos.json';

let allProducts = [];
let stockMap = new Map();
let photosMap = new Map(); // Mapa para guardar: REFERENCIA -> URL IMAGEN

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

// --- MAGIA PARA IMÁGENES DE DRIVE ---
// Convierte un enlace de "vista previa" en un enlace directo de imagen
function getDriveDirectLink(driveUrl) {
    if (!driveUrl) return null;
    try {
        // Buscamos el ID que está entre /d/ y /view o ?id=
        const match = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
            // Usamos el servidor lh3 de Google que sirve imágenes estáticas directamente
            return `https://lh3.googleusercontent.com/d/${match[1]}`;
        }
    } catch (e) {
        return null;
    }
    return null;
}

// --- CARGA DE DATOS ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const [stockRes, tariffRes, photosRes] = await Promise.all([
            fetch(`src/Stock.json?v=${Date.now()}`),
            fetch(`src/${TARIFF_FILE}?v=${Date.now()}`),
            fetch(`src/${PHOTOS_FILE}?v=${Date.now()}`)
        ]);

        // 1. Cargar Stock
        const stockData = await stockRes.json();
        if(stockData.Stock) stockData.Stock.forEach(i => stockMap.set(String(i.Artículo), i));

        // 2. Cargar y Procesar Fotos
        const photosData = await photosRes.json();
        if (Array.isArray(photosData)) {
            photosData.forEach(item => {
                // Ignorar archivos de sistema
                if (!item.nombre || item.nombre === 'Thumbs.db') return;

                // Extraer el nombre sin la extensión (ej: "1034.jpg" -> "1034")
                // Usamos lastIndexOf por si el nombre tiene puntos intermedios
                let lastDotIndex = item.nombre.lastIndexOf('.');
                let refLimpia = (lastDotIndex === -1) ? item.nombre : item.nombre.substring(0, lastDotIndex);
                
                // Normalizar referencia (Mayúsculas y sin espacios)
                refLimpia = refLimpia.toUpperCase().trim();

                // Convertir URL de Drive a URL de Imagen Directa
                const directUrl = getDriveDirectLink(item.url);
                
                if (directUrl) {
                    photosMap.set(refLimpia, directUrl);
                }
            });
        }

        // 3. Cargar Tarifa
        const tariffData = await tariffRes.json();
        const sheet = Object.keys(tariffData)[0];
        allProducts = tariffData[sheet];

        console.log(`Sistema listo. Productos: ${allProducts.length}. Fotos cargadas: ${photosMap.size}`);

    } catch (error) {
        resultsContainer.innerHTML = '<p style="text-align:center;color:red">Error cargando datos. Revisa la consola.</p>';
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

// --- RENDERIZADO ---
function displayResults(products) {
    if (!products.length) {
        resultsContainer.innerHTML = '<p style="text-align:center; padding:20px; color:#666;">No hay resultados.</p>';
        return;
    }

    let html = '';
    products.forEach((p, idx) => {
        
        // DATOS BÁSICOS
        let pvpReal = parseFloat(p.PVP || p.TARIFA || p.Tarifa || p.Precio_Lista || 0); 
        const precioStd = parseFloat(p.PRECIO_ESTANDAR || 0);
        const netoRaw = p.NETOS_GRANDE_CUENTAS ? p.CONDICION_NETO_GC : null;
        
        // LÓGICA PRECIOS: Si no hay PVP, lo inventamos (x2 del precio std) para mantener diseño
        if ((!pvpReal || pvpReal === 0) && precioStd > 0) {
            pvpReal = precioStd * 2; 
        }

        const netVal = extractNetPrice(netoRaw);
        const minQty = extractMinQty(netoRaw);
        const conditionText = cleanConditionText(netoRaw, netVal);

        // LÓGICA DESCUENTOS
        let dto1 = 0; 
        let dto2 = 0; 

        if (pvpReal > 0 && precioStd > 0) {
            dto1 = Math.round((1 - (precioStd / pvpReal)) * 100);
        }
        if (precioStd > 0 && netVal > 0) {
            dto2 = Math.round((1 - (netVal / precioStd)) * 100);
        }

        // LÓGICA STOCK
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

        // --- LÓGICA IMAGEN ---
        // Buscamos la foto usando la referencia como clave
        const refKey = String(p.Referencia).toUpperCase().trim();
        const imgUrl = photosMap.get(refKey);
        
        let imgHtml = '';
        if (imgUrl) {
            // Añadimos onerror para ocultar la imagen si el enlace falla por alguna razón
            imgHtml = `
            <div class="product-image-container">
                <img src="${imgUrl}" alt="${p.Descripcion}" class="product-img" loading="lazy" onerror="this.parentElement.style.display='none'">
            </div>`;
        }

        // --- CONSTRUCCIÓN DE PRECIOS (4 LÍNEAS) ---
        let priceBlockHtml = `<div class="price-breakdown">`;
        
        if (pvpReal > 0) {
            priceBlockHtml += `
                <div class="row-pvp">PVP: ${pvpReal.toFixed(2)} €</div>
                <div class="row-dto">DTO: ${dto1}%</div>
            `;
        }
        priceBlockHtml += `<div class="row-price">Precio: ${precioStd.toFixed(2)} €</div>`;

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
        priceBlockHtml += `</div>`; 

        // DATOS SEGUROS
        const safeRef = String(p.Referencia).replace(/["']/g, "");
        const safeDesc = String(p.Descripcion).replace(/["']/g, "");
        const safeNeto = netoRaw ? String(netoRaw).replace(/["']/g, "") : '';
        const qtyId = `qty_${idx}`;

        // RENDER FINAL
        html += `
            <div class="product-card-single">
                ${imgHtml} <!-- IMAGEN ARRIBA -->
                
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