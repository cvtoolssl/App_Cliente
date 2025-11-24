// logic/presupuesto.js

let budget = [];
const budgetModal = document.getElementById('budget-modal');
const budgetCountSpan = document.getElementById('budget-count');
const budgetItemsContainer = document.getElementById('budget-items-container');

// --- DATOS GLOBALES ---
const URL_FICHAS = "https://cvtoolssl.github.io/Alta_Cliente/fichas.html"; // Ajusta a tu URL real

// --- AÑADIR ---
function addToBudget(ref, desc, stdPrice, qty, netInfo, minQty, netPriceVal, stockText) {
    qty = parseInt(qty) || 1;
    if (qty < 1) qty = 1;
    
    // Buscar si ya existe
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
    if(confirm('¿Borrar todo el presupuesto?')) {
        budget = [];
        updateBudgetUI();
        toggleBudgetModal();
    }
}

// --- CÁLCULOS INTERNOS ---
function calculateItemCost(item) {
    // Determina si aplica el precio neto por cantidad o el estándar
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
        budgetItemsContainer.innerHTML = budget.length ? html : '<p class="empty-msg">Vacío</p>';
        const totalDisplay = document.getElementById('budget-total');
        if(totalDisplay) totalDisplay.textContent = subtotal.toFixed(2);
    }
}

function toggleBudgetModal() {
    budgetModal.classList.toggle('hidden');
}

function animateFab() {
    const fab = document.getElementById('budget-fab');
    if(fab) {
        fab.style.transform = 'scale(1.2)';
        setTimeout(() => fab.style.transform = 'scale(1)', 200);
    }
}

// ==========================================
// 🚀 NUEVA FUNCIÓN: WHATSAPP CON MARGEN
// ==========================================
function copyBudgetWithMargin() {
    if (budget.length === 0) return;

    // 1. Preguntar Margen
    let marginInput = prompt("¿Qué margen de beneficio (%) quieres aplicar para tu cliente?\nEjemplo: Escribe 20 para un 20%", "0");
    let margin = parseFloat(marginInput);
    
    if (isNaN(margin) || margin < 0) {
        alert("Por favor, introduce un número válido.");
        return;
    }

    let text = `📑 *PRESUPUESTO*\n📅 Fecha: ${new Date().toLocaleDateString()}\n--------------------------------\n\n`;
    let finalTotal = 0;

    budget.forEach(item => {
        // Coste real para el cliente (distribuidor)
        const costData = calculateItemCost(item); 
        
        // Precio Venta al Público (Aplicando el margen)
        // Fórmula: Coste * (1 + (Margen / 100))
        const pvpUnit = costData.unit * (1 + (margin / 100));
        const pvpTotal = pvpUnit * item.qty;
        
        finalTotal += pvpTotal;

        text += `🔹 *${item.desc}*\n`;
        // Opcional: Ocultar referencia si el cliente no quiere que se compare
        text += `   Ref: ${item.ref}\n`; 
        text += `   Cant: ${item.qty} x ${pvpUnit.toFixed(2)} €\n`;
        text += `   *Subtotal: ${pvpTotal.toFixed(2)} €*\n\n`;
    });

    text += `--------------------------------\n`;
    text += `💰 *TOTAL: ${finalTotal.toFixed(2)} €*\n`;
    text += `(Impuestos no incluidos)\n`;

    // API Clipboard
    navigator.clipboard.writeText(text).then(() => {
        alert(`✅ Presupuesto copiado con un +${margin}% de margen.\n\nAhora pégalo en WhatsApp.`);
    }).catch(err => {
        console.error(err);
        alert('Error al copiar. Inténtalo de nuevo.');
    });
}

// --- DESCARGAR PDF (PARA USO INTERNO DEL CLIENTE) ---
function downloadBudgetPdf() {
    if (budget.length === 0) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const logoImg = document.getElementById('logo-for-pdf');
    if (logoImg) try { doc.addImage(logoImg, 'PNG', 14, 10, 30, 10); } catch(e){}

    doc.text('PEDIDO / PRESUPUESTO', 195, 20, { align: 'right' });
    
    let subtotal = 0;
    const body = budget.map(item => {
        const cost = calculateItemCost(item);
        subtotal += cost.total;
        return [item.ref, item.desc, item.qty, `${cost.unit.toFixed(2)}€`, `${cost.total.toFixed(2)}€`];
    });

    doc.autoTable({
        startY: 30,
        head: [['Ref', 'Descripción', 'Cant', 'Precio Coste', 'Total']],
        body: body,
        theme: 'grid'
    });

    doc.text(`Total Coste: ${subtotal.toFixed(2)} €`, 195, doc.lastAutoTable.finalY + 10, { align: 'right' });
    doc.save('Pedido_CVTools.pdf');
}