// logic/presupuesto.js

// === CONFIGURACIÓN ===
// Asegúrate de que este enlace sea correcto para que los clientes puedan descargar fichas
const URL_FICHAS_WEB = "https://cvtoolssl.github.io/Alta_Cliente/fichas.html"; 
const EMAIL_PEDIDOS = "pedidos@cvtools.com"; // Vuestro correo para recibir pedidos

let budget = [];
const budgetModal = document.getElementById('budget-modal');
const budgetCountSpan = document.getElementById('budget-count');
const budgetItemsContainer = document.getElementById('budget-items-container');

// --- AÑADIR / QUITAR ---
function addToBudget(ref, desc, stdPrice, qty, netInfo, minQty, netPriceVal, stockText) {
    qty = parseInt(qty) || 1;
    const existing = budget.find(i => i.ref === ref);
    
    if (existing) {
        existing.qty += qty;
    } else {
        budget.push({
            ref, desc, stdPrice, qty,
            netInfo, minQty, netPriceVal, stockText: stockText || "Consultar"
        });
    }
    updateBudgetUI();
    animateFab();
}

function removeFromBudget(index) {
    budget.splice(index, 1);
    updateBudgetUI();
}

function clearBudget() {
    if(confirm('¿Estás seguro de vaciar todo?')) {
        budget = [];
        updateBudgetUI();
        toggleBudgetModal();
    }
}

// --- CÁLCULOS ---
function calculateItemCost(item) {
    // Usa precio neto si supera la cantidad mínima
    if (item.minQty > 0 && item.netPriceVal > 0 && item.qty >= item.minQty) {
        return { unit: item.netPriceVal, total: item.netPriceVal * item.qty, isNet: true };
    }
    return { unit: item.stdPrice, total: item.stdPrice * item.qty, isNet: false };
}

// --- INTERFAZ (UI) ---
function updateBudgetUI() {
    if (budgetCountSpan) budgetCountSpan.textContent = budget.length;
    
    let subtotal = 0;
    let html = '';

    budget.forEach((item, index) => {
        const cost = calculateItemCost(item);
        subtotal += cost.total;

        html += `
            <div class="budget-item">
                <div class="budget-item-info">
                    <strong>${item.desc}</strong>
                    <br><span style="font-size:0.8em; color:#555">${item.ref} | ${item.stockText}</span>
                    ${cost.isNet ? '<br><span style="color:green; font-size:0.7em">✅ Neto aplicado</span>' : ''}
                </div>
                <div style="text-align:right">
                    <div>${item.qty} x ${cost.unit.toFixed(2)}€</div>
                    <strong>${cost.total.toFixed(2)} €</strong>
                </div>
                <button class="remove-btn" onclick="removeFromBudget(${index})">&times;</button>
            </div>
        `;
    });

    if (budgetItemsContainer) budgetItemsContainer.innerHTML = budget.length ? html : '<p class="empty-msg">Vacío</p>';
    const totalDisplay = document.getElementById('budget-total');
    if (totalDisplay) totalDisplay.textContent = subtotal.toFixed(2);
}

function toggleBudgetModal() {
    if(budgetModal) budgetModal.classList.toggle('hidden');
}

function animateFab() {
    const fab = document.getElementById('budget-fab');
    if(fab) {
        fab.style.transform = 'scale(1.2)';
        setTimeout(() => fab.style.transform = 'scale(1)', 200);
    }
}

// ============================================================
// 🚀 FUNCIONES DE LOS 4 BOTONES
// ============================================================

// AUXILIAR: Pide margen
function getMargin() {
    let input = prompt("Introduce el % de MARGEN para TU cliente (Ej: 20):", "0");
    if (input === null) return null; 
    let m = parseFloat(input);
    return (isNaN(m) || m < 0) ? 0 : m;
}

// AUXILIAR: Genera texto para Cliente Final
function generateClientText(margin) {
    let text = `📑 *PRESUPUESTO*\n📅 Fecha: ${new Date().toLocaleDateString()}\n--------------------------------\n\n`;
    let total = 0;

    budget.forEach(item => {
        const cost = calculateItemCost(item);
        // Inflamos el precio con el margen
        const pvpUnit = cost.unit * (1 + (margin / 100));
        const pvpTotal = pvpUnit * item.qty;
        total += pvpTotal;

        text += `🔹 *${item.desc}*\n`;
        text += `   Ref: ${item.ref}\n`;
        text += `   Cant: ${item.qty} x ${pvpUnit.toFixed(2)} €\n`;
        text += `   Subtotal: ${pvpTotal.toFixed(2)} €\n\n`;
    });

    text += `--------------------------------\n`;
    text += `💰 *TOTAL: ${total.toFixed(2)} €*\n`;
    text += `(Impuestos no incluidos)\n\n`;
    
    // ENLACE FICHAS TÉCNICAS
    text += `📥 *Descarga Fichas Técnicas aquí:*\n${URL_FICHAS_WEB}`;
    
    return text;
}

// 1. WHATSAPP (CLIENTE)
function sendClientWhatsApp() {
    if (!budget.length) return alert("Carrito vacío");
    const m = getMargin();
    if (m === null) return;

    const text = generateClientText(m);
    
    navigator.clipboard.writeText(text).then(() => {
        alert("✅ Texto copiado. Pégalo en WhatsApp.");
    }).catch(() => alert("Copiado al portapapeles."));
}

// 2. EMAIL (CLIENTE)
function sendClientEmail() {
    if (!budget.length) return alert("Carrito vacío");
    const m = getMargin();
    if (m === null) return;

    const body = generateClientText(m);
    window.location.href = `mailto:?subject=Presupuesto Materiales&body=${encodeURIComponent(body)}`;
}

// 3. PEDIDO A CVTOOLS (INTERNO)
function sendOrderToCVTools() {
    if (!budget.length) return alert("Carrito vacío");
    if (!confirm("¿Generar correo de pedido para CVTools?")) return;

    let text = `HOLA CVTOOLS, SOLICITO EL SIGUIENTE MATERIAL:\n\n`;
    let total = 0;

    budget.forEach(item => {
        const cost = calculateItemCost(item);
        total += cost.total;
        text += `[${item.ref}] ${item.desc} -> ${item.qty} uds\n`;
    });

    text += `\nTotal Coste Estimado: ${total.toFixed(2)} €\n`;
    text += `\nMis datos de cliente:\n(Escribe aquí tu nombre/código)\n`;

    window.location.href = `mailto:${EMAIL_PEDIDOS}?subject=PEDIDO WEB&body=${encodeURIComponent(text)}`;
}