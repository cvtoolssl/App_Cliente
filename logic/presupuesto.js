// logic/presupuesto.js

// === CONFIGURACIÓN ===
// IMPORTANTE: Pon aquí la URL real de tu carpeta de fichas
const URL_FICHAS_WEB = "https://cvtoolssl.github.io/Alta_Cliente/fichas.html"; 
const EMAIL_PEDIDOS = "pedidos@cvtools.com"; 

let budget = [];
// Elementos del DOM
const budgetModal = document.getElementById('budget-modal');
const marginModal = document.getElementById('margin-modal');
const budgetCountSpan = document.getElementById('budget-count');
const budgetItemsContainer = document.getElementById('budget-items-container');

// Variable para saber qué botón pulsó (whatsapp o email)
let pendingAction = null; 

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
    if(confirm('¿Borrar todo el carrito?')) {
        budget = [];
        updateBudgetUI();
        toggleBudgetModal();
    }
}

// --- CÁLCULOS ---
function calculateItemCost(item) {
    // Si cumple condiciones de neto, usa neto. Si no, precio estándar.
    if (item.minQty > 0 && item.netPriceVal > 0 && item.qty >= item.minQty) {
        return { unit: item.netPriceVal, total: item.netPriceVal * item.qty, isNet: true };
    }
    return { unit: item.stdPrice, total: item.stdPrice * item.qty, isNet: false };
}

// --- UI ---
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
// 🚀 GESTIÓN DEL MARGEN (Pop-up Bonito)
// ============================================================

// 1. Abrir el modal de margen y recordar qué acción queríamos hacer
function openMarginModal(action) {
    if (budget.length === 0) return alert("El carrito está vacío.");
    
    pendingAction = action; // 'whatsapp' o 'email'
    marginModal.classList.remove('hidden');
}

function closeMarginModal() {
    marginModal.classList.add('hidden');
    pendingAction = null;
}

// 2. Confirmar y Ejecutar
function confirmMarginAction() {
    const input = document.getElementById('margin-input');
    let margin = parseFloat(input.value);
    
    if (isNaN(margin) || margin < 0) margin = 0;

    // Ejecutar la acción pendiente
    if (pendingAction === 'whatsapp') {
        sendClientWhatsApp(margin);
    } else if (pendingAction === 'email') {
        sendClientEmail(margin);
    }

    closeMarginModal();
}

// AUXILIAR: Genera texto para Cliente Final (CON ENLACE DE FICHAS)
function generateClientText(margin) {
    let text = `📑 *PRESUPUESTO*\n📅 Fecha: ${new Date().toLocaleDateString()}\n--------------------------------\n\n`;
    let total = 0;

    budget.forEach(item => {
        const cost = calculateItemCost(item);
        // Aplicar margen: Coste * (1 + margen/100)
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
    
    // ✅ AQUÍ SE AÑADE EL ENLACE (Solo para cliente final)
    text += `📥 *Descarga Fichas Técnicas y Certificados aquí:*\n${URL_FICHAS_WEB}`;
    
    return text;
}

// ACCIÓN REAL: WhatsApp
function sendClientWhatsApp(margin) {
    const text = generateClientText(margin);
    navigator.clipboard.writeText(text).then(() => {
        alert("✅ Presupuesto copiado. Abriendo WhatsApp...");
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }).catch(() => {
        alert("Texto copiado al portapapeles. Pégalo en WhatsApp.");
    });
}

// ACCIÓN REAL: Email
function sendClientEmail(margin) {
    const body = generateClientText(margin);
    window.location.href = `mailto:?subject=Presupuesto Materiales&body=${encodeURIComponent(body)}`;
}

// ============================================================
// 🚀 PEDIDO INTERNO (A CV TOOLS) - SIN MARGEN, SIN FICHAS
// ============================================================
function sendOrderToCVTools() {
    if (budget.length === 0) return alert("El carrito está vacío.");
    if (!confirm("¿Enviar pedido a CVTools con tus precios de coste?")) return;

    let text = `HOLA CVTOOLS, SOLICITO EL SIGUIENTE MATERIAL:\n\n`;
    let total = 0;

    budget.forEach(item => {
        const cost = calculateItemCost(item);
        total += cost.total;
        // Formato simple para proveedor
        text += `[${item.ref}] ${item.desc} -> ${item.qty} uds\n`;
    });

    text += `\nTotal Coste: ${total.toFixed(2)} €\n`;
    text += `\nMis datos de cliente:\n(Nombre/Código Cliente)\n`;

    // ❌ AQUÍ NO SE AÑADE EL ENLACE DE FICHAS

    window.location.href = `mailto:${EMAIL_PEDIDOS}?subject=NUEVO PEDIDO WEB&body=${encodeURIComponent(text)}`;
}