// logic/presupuesto.js

// --- CONFIGURACIÓN ---
// Enlace donde están las fichas (ajusta esto si cambia la URL final)
const URL_FICHAS_WEB = "https://cvtoolssl.github.io/Alta_Cliente/fichas.html";
// Correo donde recibiréis los pedidos
const EMAIL_PEDIDOS_CVTOOLS = "pedidos@cvtools.com"; 

let budget = [];
const budgetModal = document.getElementById('budget-modal');
const budgetCountSpan = document.getElementById('budget-count');
const budgetItemsContainer = document.getElementById('budget-items-container');

// --- GESTIÓN DEL ARRAY DEL PRESUPUESTO ---

function addToBudget(ref, desc, stdPrice, qty, netInfo, minQty, netPriceVal, stockText) {
    qty = parseInt(qty) || 1;
    if (qty < 1) qty = 1;
    
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
    if(confirm('¿Seguro que quieres borrar todo el carrito?')) {
        budget = [];
        updateBudgetUI();
        toggleBudgetModal();
    }
}

// --- CÁLCULOS ---
function calculateItemCost(item) {
    // Lógica: Si supera cantidad mínima y hay precio neto, usa el neto
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
                    <br><span style="font-size:0.8em; color:#666">${item.ref} | ${item.stockText}</span>
                    ${cost.isNet ? '<br><span style="color:green; font-size:0.8em">✅ Precio Neto aplicado</span>' : ''}
                </div>
                <div style="text-align:right">
                    <div>${item.qty} x ${cost.unit.toFixed(2)}€</div>
                    <strong>${cost.total.toFixed(2)} €</strong>
                </div>
                <button class="remove-btn" onclick="removeFromBudget(${index})">&times;</button>
            </div>
        `;
    });

    if (budgetItemsContainer) {
        budgetItemsContainer.innerHTML = budget.length ? html : '<p class="empty-msg">El carrito está vacío.</p>';
        const totalDisplay = document.getElementById('budget-total');
        if(totalDisplay) totalDisplay.textContent = subtotal.toFixed(2);
    }
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
// 🚀 FUNCIONES DE ENVÍO (AQUÍ ESTÁ LA NUEVA LÓGICA)
// ============================================================

// 1. AUXILIAR: PIDE EL MARGEN AL USUARIO
function getMargin() {
    let input = prompt("Introduce el % de Margen de beneficio para TU cliente:\n(Ejemplo: 20 para un 20%)", "0");
    if (input === null) return null; // Cancelado
    let margin = parseFloat(input);
    return (isNaN(margin) || margin < 0) ? 0 : margin;
}

// 2. AUXILIAR: GENERA EL TEXTO PARA EL CLIENTE FINAL (CON PRECIOS INFLADOS)
function generateClientText(margin) {
    let text = `📑 *PRESUPUESTO*\n📅 Fecha: ${new Date().toLocaleDateString()}\n--------------------------------\n\n`;
    let finalTotal = 0;

    budget.forEach(item => {
        const cost = calculateItemCost(item);
        // Fórmula PVP = Coste * (1 + Margen/100)
        const pvpUnit = cost.unit * (1 + (margin / 100));
        const pvpTotal = pvpUnit * item.qty;
        finalTotal += pvpTotal;

        text += `🔹 *${item.desc}*\n`;
        text += `   Ref: ${item.ref}\n`; 
        text += `   Cant: ${item.qty} x ${pvpUnit.toFixed(2)} €\n`;
        text += `   *Subtotal: ${pvpTotal.toFixed(2)} €*\n\n`;
    });

    text += `--------------------------------\n`;
    text += `💰 *TOTAL: ${finalTotal.toFixed(2)} €*\n`;
    text += `(Impuestos no incluidos)\n\n`;
    
    // AÑADIDO: ENLACE A FICHAS
    text += `📥 *Descarga las Fichas Técnicas y Certificados aquí:*\n${URL_FICHAS_WEB}`;

    return text;
}

// --- OPCIÓN B: WHATSAPP A CLIENTE FINAL ---
function sendClientWhatsApp() {
    if (budget.length === 0) return alert("El carrito está vacío");
    
    const margin = getMargin();
    if (margin === null) return;

    const text = generateClientText(margin);
    
    navigator.clipboard.writeText(text).then(() => {
        alert(`✅ Presupuesto con +${margin}% copiado.\nAhora pégalo en WhatsApp.`);
        // Opcional: Abrir WhatsApp Web directamente
        // window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }).catch(() => alert("Copiado al portapapeles. Pégalo en WhatsApp."));
}

// --- OPCIÓN C: CORREO A CLIENTE FINAL ---
function sendClientEmail() {
    if (budget.length === 0) return alert("El carrito está vacío");

    const margin = getMargin();
    if (margin === null) return;

    const body = generateClientText(margin);
    const subject = "Presupuesto de Materiales";
    
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// --- OPCIÓN D: PEDIDO A CVTOOLS (INTERNO) ---
function sendOrderToCVTools() {
    if (budget.length === 0) return alert("El carrito está vacío");

    if(!confirm("¿Generar pedido para enviar a CVTools?\n(Se usarán tus precios de coste)")) return;

    // Generamos texto limpio para el proveedor (vosotros)
    let text = `HOLA CVTOOLS, QUIERO REALIZAR EL SIGUIENTE PEDIDO:\n\n`;
    let subtotal = 0;

    budget.forEach(item => {
        const cost = calculateItemCost(item);
        subtotal += cost.total;
        // Formato simple: REF - DESC - CANT
        text += `[${item.ref}] ${item.desc} -> ${item.qty} uds\n`;
    });

    text += `\nTotal Estimado (Coste): ${subtotal.toFixed(2)} €\n`;
    text += `\nMis Datos:\n(Pon aquí tu nombre de empresa y nº cliente)`;

    const subject = `NUEVO PEDIDO - ${new Date().toLocaleDateString()}`;
    
    // Abrimos el cliente de correo dirigido a vosotros
    window.location.href = `mailto:${EMAIL_PEDIDOS_CVTOOLS}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
}