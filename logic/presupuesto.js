// logic/presupuesto.js

// === CONFIGURACIÓN ===
// ✅ URL CORRECTA SOLICITADA
const URL_FICHAS_WEB = "https://cvtoolssl.github.io/App_Cliente/fichas.html"; 
const EMAIL_PEDIDOS = "pedidos@cvtools.com"; 

let budget = [];
const budgetModal = document.getElementById('budget-modal');
const marginModal = document.getElementById('margin-modal');
const budgetCountSpan = document.getElementById('budget-count');
const budgetItemsContainer = document.getElementById('budget-items-container');

let pendingAction = null; 

// --- AÑADIR / QUITAR / UI (Sin cambios en la lógica interna) ---
function addToBudget(ref, desc, stdPrice, qty, netInfo, minQty, netPriceVal, stockText) {
    qty = parseInt(qty) || 1;
    const existing = budget.find(i => i.ref === ref);
    if (existing) { existing.qty += qty; } 
    else {
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

function calculateItemCost(item) {
    if (item.minQty > 0 && item.netPriceVal > 0 && item.qty >= item.minQty) {
        return { unit: item.netPriceVal, total: item.netPriceVal * item.qty, isNet: true };
    }
    return { unit: item.stdPrice, total: item.stdPrice * item.qty, isNet: false };
}

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
            </div>`;
    });

    if (budgetItemsContainer) budgetItemsContainer.innerHTML = budget.length ? html : '<p class="empty-msg">Vacío</p>';
    const totalDisplay = document.getElementById('budget-total');
    if (totalDisplay) totalDisplay.textContent = subtotal.toFixed(2);
}

function toggleBudgetModal() { if(budgetModal) budgetModal.classList.toggle('hidden'); }
function animateFab() {
    const fab = document.getElementById('budget-fab');
    if(fab) { fab.style.transform = 'scale(1.2)'; setTimeout(() => fab.style.transform = 'scale(1)', 200); }
}

// ============================================================
// 🚀 GESTIÓN DEL MARGEN Y ENVÍO
// ============================================================

function openMarginModal(action) {
    if (budget.length === 0) return alert("El carrito está vacío.");
    pendingAction = action; 
    marginModal.classList.remove('hidden');
}

function closeMarginModal() {
    marginModal.classList.add('hidden');
    pendingAction = null;
}

function confirmMarginAction() {
    const input = document.getElementById('margin-input');
    let margin = parseFloat(input.value);
    if (isNaN(margin) || margin < 0) margin = 0;

    if (pendingAction === 'whatsapp') {
        sendClientWhatsApp(margin);
    } else if (pendingAction === 'email') {
        sendClientEmail(margin);
    }
    closeMarginModal();
}

// 📝 GENERAR TEXTO (ICONOS MEJORADOS Y SIMPLES)
function generateClientText(margin) {
    // Iconos universales: 📄 (Page), 📦 (Box), 💶 (Euro)
    let text = `📄 *PRESUPUESTO*\n📅 Fecha: ${new Date().toLocaleDateString()}\n--------------------------------\n\n`;
    let total = 0;

    budget.forEach(item => {
        const cost = calculateItemCost(item);
        const pvpUnit = cost.unit * (1 + (margin / 100));
        const pvpTotal = pvpUnit * item.qty;
        total += pvpTotal;

        // Formato limpio sin viñetas raras
        text += `📦 *${item.desc}*\n`;
        text += `   Ref: ${item.ref}\n`;
        text += `   Cant: ${item.qty} x ${pvpUnit.toFixed(2)} €\n`;
        text += `   Subtotal: ${pvpTotal.toFixed(2)} €\n\n`;
    });

    text += `--------------------------------\n`;
    text += `💶 *TOTAL: ${total.toFixed(2)} €*\n`;
    text += `(Impuestos no incluidos)\n\n`;
    
    // ✅ ENLACE CORRECTO
    text += `📥 *Descarga Fichas Técnicas:*\n${URL_FICHAS_WEB}`;
    
    return text;
}

// 📲 WHATSAPP (SOLO COPIAR)
function sendClientWhatsApp(margin) {
    const text = generateClientText(margin);
    
    // Solo copiar al portapapeles
    navigator.clipboard.writeText(text).then(() => {
        alert("✅ ¡Copiado!\n\nEl presupuesto está en tu portapapeles.\nAhora abre WhatsApp y pégalo en el chat de tu cliente.");
    }).catch(() => {
        alert("Error al copiar. Inténtalo de nuevo.");
    });
    
    // NOTA: Eliminado window.open para no forzar la apertura
}

// 📧 EMAIL
function sendClientEmail(margin) {
    const body = generateClientText(margin);
    window.location.href = `mailto:?subject=Presupuesto Materiales&body=${encodeURIComponent(body)}`;
}

// 🏭 PEDIDO INTERNO
function sendOrderToCVTools() {
    if (budget.length === 0) return alert("Carrito vacío.");
    if (!confirm("¿Generar pedido interno para CVTools?")) return;

    let text = `HOLA CVTOOLS, SOLICITO EL SIGUIENTE MATERIAL:\n\n`;
    let total = 0;

    budget.forEach(item => {
        const cost = calculateItemCost(item);
        total += cost.total;
        text += `[${item.ref}] ${item.desc} -> ${item.qty} uds\n`;
    });

    text += `\nTotal Coste (Neto): ${total.toFixed(2)} €\n`;
    text += `\nDatos del Cliente:\n(Rellenar datos aquí)\n`;

    window.location.href = `mailto:${EMAIL_PEDIDOS}?subject=NUEVO PEDIDO WEB&body=${encodeURIComponent(text)}`;
}