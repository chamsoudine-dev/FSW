// Configuration initiale des tâches si LocalStorage est vide
const initialTasks = [
    { id: 1, client: "Sophie Martin", phone: "22790000000", type: "Robe de mariée", price: 150000, dueDate: "2026-04-10", step: "agenda", notes: "Premier essayage le 20/03" },
    { id: 2, client: "Julien Dubois", phone: "22790000000", type: "Costume sur mesure", price: 75000, dueDate: "2026-03-25", step: "atelier", notes: "Ourlets à finaliser" },
    { id: 3, client: "Marie Claire", phone: "22790000000", type: "Robe de soirée", price: 30000, dueDate: "2026-03-18", step: "boutique", notes: "Prêt, la cliente passe mercredi" }
];

// Initialisation globale
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    updateDateDisplay();
    initData(); // Charge les données de l'API puis affiche l'interface
});

// === THEME MANAGEMENT ===
function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    
    // Appliquer la couleur de thème
    const savedColor = localStorage.getItem('coutureColor');
    if (savedColor) {
        document.body.classList.add(savedColor);
    }

    if (!themeToggle) return;
    
    // Vérifier les préférences
    const savedTheme = localStorage.getItem('coutureTheme');
    if (savedTheme === 'dark') {
        document.body.classList.replace('light-theme', 'dark-theme');
        themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }

    themeToggle.addEventListener('click', () => {
        if (document.body.classList.contains('light-theme')) {
            document.body.classList.replace('light-theme', 'dark-theme');
            localStorage.setItem('coutureTheme', 'dark');
            themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
        } else {
            document.body.classList.replace('dark-theme', 'light-theme');
            localStorage.setItem('coutureTheme', 'light');
            themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
        }
    });
}

function updateDateDisplay() {
    const dateEl = document.getElementById('current-date');
    if(!dateEl) return;
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const date = new Date().toLocaleDateString('fr-FR', options);
    dateEl.innerText = date.charAt(0).toUpperCase() + date.slice(1);
}

// === DATA MANAGEMENT ===
let localTasks = [];

async function initData() {
    try {
        const response = await fetch('api.php?action=getAll');
        if (response.ok) {
            localTasks = await response.json();
            
            // Si la base distante est vierge, on charge initialTasks (ou localStorage si existant)
            if (localTasks.length === 0) {
                // Tentative de récupération depuis LocalStorage pour migration
                const oldTasks = JSON.parse(localStorage.getItem('coutureTasks'));
                localTasks = oldTasks && oldTasks.length > 0 ? oldTasks : initialTasks;
                
                // On met à jour la base distante une par une
                for (const t of localTasks) {
                    await saveTaskToDB(t);
                }
            }
        } else {
            throw new Error("Erreur réponse serveur");
        }
    } catch(e) {
        console.error("Erreur backend asynchrone, utilisation purement locale", e);
        localTasks = JSON.parse(localStorage.getItem('coutureTasks')) || initialTasks;
    }
    
    updateStats();
    if(typeof renderAgenda === "function") renderAgenda();
    if(typeof renderAtelier === "function") renderAtelier();
    if(typeof renderBoutique === "function") renderBoutique();
    if(typeof renderBibliotheque === "function") renderBibliotheque();
    if(typeof renderTailleur === "function") renderTailleur();
}

function getTasks() {
    return localTasks;
}

async function saveTaskToDB(task) {
    try {
        await fetch('api.php?action=save', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(task)
        });
        localStorage.setItem('coutureTasks', JSON.stringify(localTasks)); // Synchro pour event "storage"
    } catch(e) {
        console.error("Erreur lors de l'enregistrement backend", e);
    }
}

async function deleteTaskFromDB(id) {
    try {
        await fetch('api.php?action=delete', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({id: id})
        });
        localStorage.setItem('coutureTasks', JSON.stringify(localTasks)); // Synchro pour event "storage"
    } catch(e) {
        console.error("Erreur lors de la suppression backend", e);
    }
}

function updateStats() {
    const tasks = getTasks();
    const statAgenda = document.getElementById('stat-agenda');
    const statAtelier = document.getElementById('stat-atelier');
    const statBoutique = document.getElementById('stat-boutique');
    
    if(statAgenda) statAgenda.innerText = tasks.filter(t => t.step === 'agenda').length;
    if(statAtelier) statAtelier.innerText = tasks.filter(t => t.step === 'atelier').length;
    if(statBoutique) statBoutique.innerText = tasks.filter(t => t.step === 'boutique').length;
}

// === AGENDA VIEWS ===
function renderAgenda() {
    const agendaList = document.getElementById('agenda-list');
    if (!agendaList) return;
    
    const tasks = getTasks();
    // On affiche dans l'agenda uniquement les tâches en 'agenda' (Rendez-vous) ou toutes les tâches selon le besoin, 
    // mais restons focus sur 'agenda' et 'atelier' récent.
    const agendaTasks = tasks.filter(t => t.step === 'agenda').sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));

    agendaList.innerHTML = '';
    
    if(agendaTasks.length === 0) {
        agendaList.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding: 2rem;">Aucun rendez-vous planifié.</p>';
        return;
    }

    agendaTasks.forEach(task => {
        const dateObj = new Date(task.dueDate);
        const formattedDate = dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
        
        let photoHtml = task.photo ? `<img src="${task.photo}" class="cloth-thumb" alt="Tissu">` : ``;

        agendaList.innerHTML += `
            <div class="agenda-item">
                <div style="display:flex; align-items:center; flex:1;">
                    ${photoHtml}
                    <div class="item-info">
                        <h4>${task.client} - ${task.type} ${task.price ? `<span style="color:var(--primary-color);">(${task.price} FCFA)</span>` : ''}</h4>
                        <p>
                            <span><i class="fa-regular fa-calendar"></i> Pour le ${formattedDate}</span>
                        </p>
                        <p style="margin-top:5px; font-size:0.85rem">${task.notes}</p>
                    </div>
                </div>
                <div class="item-actions">
                    <span class="badge badge-agenda">Rendez-vous</span>
                    <button class="btn btn-primary" style="padding: 8px 15px; font-size: 0.85rem" onclick="moveToAtelier(${task.id})">
                        <i class="fa-solid fa-arrow-right"></i> Vers Atelier
                    </button>
                    <button class="btn btn-secondary" style="padding: 8px 15px; color: var(--danger-color)" onclick="deleteTask(${task.id})">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
}

// === ATELIER & BOUTIQUE VIEWS ===
function renderAtelier() {
    const atelierList = document.getElementById('atelier-list');
    if (!atelierList) return;
    
    const tasks = getTasks().filter(t => t.step === 'atelier').sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));
    atelierList.innerHTML = '';
    
    if(tasks.length === 0) {
        atelierList.innerHTML = '<p style="color:var(--text-muted);">Aucune tâche en cours.</p>';
        return;
    }

    tasks.forEach(task => {
        const dateObj = new Date(task.dueDate);
        const formattedDate = dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
        
        let photoHtml = task.photo ? `<div class="atelier-thumb-wrap"><img src="${task.photo}" class="atelier-thumb" alt="Tissu"></div>` : ``;

        // Carte style Kanban
        atelierList.innerHTML += `
            <div class="glass-panel" style="padding: 1.5rem; display:flex; flex-direction:column; gap:10px; border-top: 4px solid var(--warning-color);">
                <div style="display:flex; justify-content:space-between;">
                    <span class="badge badge-atelier"><i class="fa-solid fa-tape"></i> Atelier</span>
                    <strong style="color:var(--danger-color); font-size:0.9rem;"><i class="fa-regular fa-clock"></i> ${formattedDate}</strong>
                </div>
                ${photoHtml}
                <div style="display:flex; justify-content:space-between; align-items:flex-end;">
                  <h3 style="margin-top:10px; font-size:1.2rem;">${task.client}</h3>
                  ${task.phone ? `<span style="font-size:0.8rem; color:var(--text-muted);"><i class="fa-brands fa-whatsapp"></i> ${task.phone}</span>` : ''}
                </div>
                <p style="color:var(--text-muted); font-weight:500;">${task.type} <br><strong style="color:var(--primary-color)">${task.price ? task.price + ' FCFA' : ''}</strong></p>
                <div style="background:var(--bg-color); padding: 10px; border-radius:8px; font-size:0.85rem; margin:10px 0;">
                    ${task.notes}
                </div>
                <div style="display:flex; gap:10px; margin-top:auto; padding-top:10px;">
                    <button class="btn btn-primary" style="flex:1; justify-content:center; background:var(--success-color);" onclick="moveToBoutique(${task.id})">
                        <i class="fa-solid fa-check"></i> Terminer & Boutique
                    </button>
                    <button class="btn btn-secondary" onclick="deleteTask(${task.id})"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
    });
}

function renderBoutique(searchTerm = '') {
    const boutiqueList = document.getElementById('boutique-list');
    if (!boutiqueList) return;
    
    let tasks = getTasks().filter(t => t.step === 'boutique');
    
    // Filtrage recherche Boutique
    if(searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        tasks = tasks.filter(t => 
            t.client.toLowerCase().includes(lowerTerm) || 
            (t.phone && t.phone.includes(lowerTerm))
        );
    }
    
    boutiqueList.innerHTML = '';
    
    if(tasks.length === 0) {
        boutiqueList.innerHTML = '<p style="color:var(--text-muted);">Aucun article prêt pour le moment.</p>';
        return;
    }

    tasks.forEach(task => {
        let photoHtml = task.photo ? `<div class="atelier-thumb-wrap"><img src="${task.photo}" class="atelier-thumb" alt="Tissu"></div>` : ``;

        // Bouton WhatsApp
        let whatsappBtn = '';
        if (task.phone) {
            // Nettoyage du numéro
            let cleanPhone = task.phone.replace(/[^0-9]/g, '');
            // Message pré-rempli
            let message = encodeURIComponent(`Bonjour ${task.client}, votre création "${task.type}" est prête chez Sarkin Wanka Fashion Design ! Vous pouvez passer la récupérer. Merci.`);
            whatsappBtn = `
                <a href="https://wa.me/${cleanPhone}?text=${message}" target="_blank" class="btn btn-secondary" style="flex:1; justify-content:center; color:#25D366; border-color:#25D366;">
                    <i class="fa-brands fa-whatsapp"></i> Notifier
                </a>
            `;
        }

        boutiqueList.innerHTML += `
            <div class="glass-panel" style="padding: 1.5rem; display:flex; flex-direction:column; gap:10px; border-top: 4px solid var(--success-color);">
                <div style="display:flex; justify-content:space-between;">
                    <span class="badge badge-boutique"><i class="fa-solid fa-store"></i> Prêt au retrait</span>
                </div>
                ${photoHtml}
                <div style="display:flex; justify-content:space-between; align-items:flex-end;">
                  <h3 style="margin-top:10px; font-size:1.2rem;">${task.client}</h3>
                  ${task.phone ? `<span style="font-size:0.8rem; color:var(--text-muted);"><i class="fa-brands fa-whatsapp"></i> ${task.phone}</span>` : ''}
                </div>
                <p style="color:var(--text-muted); font-weight:500;">${task.type} <br><strong style="color:var(--primary-color)">${task.price ? task.price + ' FCFA' : ''}</strong></p>
                <div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:auto; padding-top:15px;">
                    ${whatsappBtn}
                    <button class="btn btn-primary" style="flex:1; justify-content:center; min-width: 150px;" onclick="markAsDelivered(${task.id})">
                        <i class="fa-solid fa-hand-holding-hand"></i> Livrer
                    </button>
                </div>
            </div>
        `;
    });
}

// === BIBLIOTHEQUE VIEW ===
function renderBibliotheque(searchTerm = '') {
    const tableBody = document.getElementById('biblio-table-body');
    if (!tableBody) return;
    
    let tasks = getTasks();
    if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        tasks = tasks.filter(t => 
            t.client.toLowerCase().includes(lowerTerm) || 
            t.type.toLowerCase().includes(lowerTerm) || 
            (t.phone && t.phone.includes(lowerTerm))
        );
    }
    
    // Trier par date la plus récente
    tasks.sort((a,b) => new Date(b.dueDate) - new Date(a.dueDate));

    tableBody.innerHTML = '';

    if(tasks.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="padding: 20px; text-align: center; color: var(--text-muted)">Aucun résultat.</td></tr>';
        return;
    }

    tasks.forEach(task => {
        const bdgColor = task.step === 'agenda' ? 'primary' : task.step === 'atelier' ? 'warning' : task.step === 'boutique' ? 'success' : 'secondary';
        const dateObj = new Date(task.dueDate);
        const ref = 'SW-'+task.id.toString().slice(-4);
        
        let thumbUrl = task.photo ? task.photo : 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2VlZSIvPjwvc3ZnPg==';

        tableBody.innerHTML += `
            <tr style="border-bottom: 1px solid rgba(0,0,0,0.05); transition: background 0.2s;" onmouseover="this.style.background='var(--primary-light)'" onmouseout="this.style.background='transparent'">
                <td style="padding: 15px 10px; font-weight: 600;">${ref}</td>
                <td style="padding: 15px 10px;">
                    <div>${dateObj.toLocaleDateString('fr-FR')}</div>
                    <span class="badge" style="background:var(--${bdgColor}-light); color:var(--${bdgColor}-color); margin-top:5px; font-size: 0.75rem;">${task.step.toUpperCase()}</span>
                </td>
                <td style="padding: 15px 10px;">
                    <div><strong>${task.client}</strong></div>
                    <div style="font-size:0.85rem; color: var(--text-muted)"><i class="fa-brands fa-whatsapp"></i> ${task.phone || 'N/A'}</div>
                </td>
                <td style="padding: 15px 10px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <img src="${thumbUrl}" style="width:40px; height:40px; object-fit:cover; border-radius:8px;">
                        <span>${task.type}</span>
                    </div>
                </td>
                <td style="padding: 15px 10px; font-weight:600; color:var(--primary-color)">
                    ${task.price ? task.price + ' FCFA' : '-'}
                </td>
                <td style="padding: 15px 10px;">
                    <button class="btn btn-secondary" onclick="printReceipt(${JSON.stringify(task).replace(/"/g, '&quot;')})" style="padding: 5px 10px; font-size: 0.8rem; margin-right: 5px;">
                        <i class="fa-solid fa-print"></i>
                    </button>
                    <button class="btn btn-secondary" onclick="deleteTask(${task.id})" style="padding: 5px 10px; font-size: 0.8rem; color: var(--danger-color)">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

// === ACTIONS ===
async function moveToAtelier(id) {
    const tasks = getTasks();
    const index = tasks.findIndex(t => t.id === id);
    if(index > -1) {
        tasks[index].step = 'atelier';
        await saveTaskToDB(tasks[index]);
        updateStats();
        if(typeof renderAgenda === "function") renderAgenda();
        if(typeof renderAtelier === "function") renderAtelier();
    }
}

async function moveToBoutique(id) {
    const tasks = getTasks();
    const index = tasks.findIndex(t => t.id === id);
    if(index > -1) {
        tasks[index].step = 'boutique';
        await saveTaskToDB(tasks[index]);
        updateStats();
        if(typeof renderAtelier === "function") renderAtelier();
    }
}

async function finishTailleurTask(id) {
    if(confirm("Le vêtement est-il vraiment terminé et prêt à être envoyé à la boutique ?")) {
        const tasks = getTasks();
        const index = tasks.findIndex(t => t.id === id);
        if(index > -1) {
            tasks[index].step = 'boutique';
            await saveTaskToDB(tasks[index]);
            updateStats();
            if(typeof renderTailleur === "function") renderTailleur();
        }
    }
}

async function markAsDelivered(id) {
    if(confirm("Confirmer que le vêtement a été livré au client ?")) {
        const tasks = getTasks();
        const index = tasks.findIndex(t => t.id === id);
        if(index > -1) {
            tasks[index].step = 'livre'; // Historique
            await saveTaskToDB(tasks[index]);
            updateStats();
            if(typeof renderBoutique === "function") renderBoutique();
            if(typeof renderBibliotheque === "function") renderBibliotheque();
        }
    }
}

async function deleteTask(id) {
    if(confirm("Confirmer la suppression definitive ?")) {
        localTasks = localTasks.filter(t => t.id !== id);
        await deleteTaskFromDB(id);
        updateStats();
        
        if(typeof renderAgenda === "function") renderAgenda();
        if(typeof renderAtelier === "function") renderAtelier();
        if(typeof renderBoutique === "function") renderBoutique();
        if(typeof renderBibliotheque === "function") renderBibliotheque();
    }
}

// === ESPACE TAILLEUR VIEW ===
function renderTailleur() {
    const tailleurList = document.getElementById('tailleur-list');
    if (!tailleurList) return;
    
    // Le tailleur voit uniquement les tâches à l'Etape "atelier"
    let tasks = getTasks().filter(t => t.step === 'atelier').sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    // Filtrage personnalisé (seulement si assigné à soi ou libre)
    if (typeof currentUser !== 'undefined' && currentUser) {
        tasks = tasks.filter(t => !t.assignee || t.assignee.toLowerCase() === currentUser.toLowerCase());
    }
    
    tailleurList.innerHTML = '';
    
    if(tasks.length === 0) {
        tailleurList.innerHTML = '<p style="color:var(--text-muted); padding:2rem;">Aucun vêtement en attente de couture. Bon repos !</p>';
        return;
    }

    tasks.forEach(task => {
        const dateObj = new Date(task.dueDate);
        const formattedDate = dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
        
        let photoHtml = task.photo ? `<div class="atelier-thumb-wrap"><img src="${task.photo}" class="atelier-thumb" alt="Tissu"></div>` : ``;

        // Carte simplifiée (Pas de prix, pas de numéros de contact, juste le travail)
        tailleurList.innerHTML += `
            <div class="glass-panel" style="padding: 1.5rem; display:flex; flex-direction:column; gap:10px; border-top: 4px solid var(--warning-color);">
                <div style="display:flex; justify-content:space-between;">
                    <span class="badge" style="background:var(--warning-light); color:var(--warning-color);"><i class="fa-solid fa-tape"></i> À Coudre</span>
                    <strong style="color:var(--danger-color); font-size:0.9rem;"><i class="fa-regular fa-clock"></i> Livraison: ${formattedDate}</strong>
                </div>
                ${photoHtml}
                <h3 style="margin-top:10px; font-size:1.2rem;">Modèle: ${task.type}</h3>
                <p style="color:var(--text-muted); font-weight:500;">Client: ${task.client}</p>
                <div style="background:var(--bg-color); padding: 10px; border-radius:8px; font-size:0.85rem; margin:10px 0;">
                    <strong style="color:var(--text-main);"><i class="fa-solid fa-ruler"></i> Mesures & Notes :</strong><br>
                    <span style="color:var(--text-muted); line-height: 1.5;">${task.notes || 'Aucune note additionnelle.'}</span>
                </div>
                <div style="display:flex; gap:10px; margin-top:auto; padding-top:10px;">
                    <button class="btn btn-primary" style="flex:1; justify-content:center; background:var(--success-color);" onclick="finishTailleurTask(${task.id})">
                        <i class="fa-solid fa-check"></i> Produit Terminé !
                    </button>
                </div>
            </div>
        `;
    });
}

// === RECEIPT GENERATION ===
function printReceipt(task) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("La fenêtre de reçu a été bloquée par votre navigateur. Autorisez les pop-ups pour imprimer.");
        return;
    }
    
    // Charger les paramètres pour l'entête
    const settings = JSON.parse(localStorage.getItem('sw_settings')) || {};
    const shopName = settings.name || "SARKIN WANKA Fashion Design";
    const shopPhone = settings.phone || "+227 92 62 27 64";
    const cur = settings.currency || "FCFA";
    
    const dateStr = new Date(task.dueDate).toLocaleDateString('fr-FR');
    const dateToday = new Date().toLocaleDateString('fr-FR');
    
    const shopLogo = settings.photo || 'assets/img/logo.png'; // Fallback au logo par défaut si pas dans les settings
    
    let whatsappLink = '';
    if(task.phone) {
        let cleanPhone = task.phone.replace(/[^0-9]/g, '');
        let msg = encodeURIComponent(`Bonjour, voici le reçu de votre commande chez ${shopName}.\nRéf: SW-${task.id.toString().slice(-4)}\nMontant: ${task.price ? task.price + ' ' + cur : 'N/A'}`);
        whatsappLink = `<a href="https://wa.me/${cleanPhone}?text=${msg}" target="_blank" style="display:inline-block; margin-top:15px; background:#25D366; color:white; padding:10px 20px; text-decoration:none; border-radius:5px; font-weight:bold;">Envoyer le récapitulatif via WhatsApp</a>`;
    }
    
    const html = `
    <html>
    <head>
        <title>Reçu - SW-${task.id.toString().slice(-4)}</title>
        <style>
            body { font-family: 'Arial', sans-serif; color: #1A1A1A; margin: 40px; text-align: center; }
            .receipt-box { border: 2px solid #A67C00; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto; text-align: left;}
            .header { text-align: center; margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 20px;}
            .header h1 { margin: 10px 0 5px 0; color: #A67C00; font-size: 24px; text-transform: uppercase; }
            .header p { margin: 0; color: #666; font-size: 14px; }
            .tag { background: #FDF9EE; color: #A67C00; padding: 5px 10px; border-radius: 5px; font-weight: bold; }
            .content { margin-bottom: 30px; line-height: 1.6; }
            .content .row { display: flex; justify-content: space-between; border-bottom: 1px dashed #ccc; padding: 10px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px;}
            .actions { margin-top: 20px; text-align: center; }
            @media print { 
                .receipt-box { border: none; padding: 0; } 
                .actions { display: none; } 
            }
        </style>
    </head>
    <body onload="setTimeout(function(){ window.print(); }, 800);">
        <div class="receipt-box" id="receipt-content">
            <div class="header">
                <img src="${shopLogo}" style="width:100px; height:100px; object-fit:cover; border-radius:50%; margin-bottom:10px;">
                <h1>${shopName.toUpperCase()}</h1>
                <p>Excellence en Couture</p>
                <p>Tel: ${shopPhone}</p>
                <br>
                <h2>REÇU DE COMMANDE</h2>
                <span class="tag">Réf: SW-${task.id.toString().slice(-4)}</span>
            </div>
            <div class="content">
                <div class="row"><strong>Date de création:</strong> <span>${dateToday}</span></div>
                <div class="row"><strong>Client:</strong> <span>${task.client}</span></div>
                <div class="row"><strong>Contact:</strong> <span>${task.phone || 'N/A'}</span></div>
                <div class="row"><strong>Type d'Article:</strong> <span>${task.type}</span></div>
                <div class="row"><strong>Date de livraison:</strong> <span>${dateStr}</span></div>
                <div class="row"><strong>Montant:</strong> <span><strong style="font-size:18px; color:#A67C00">${task.price ? task.price + ' ' + cur : '-'}</strong></span></div>
            </div>
            <div class="footer">
                <p>Merci pour votre confiance !</p>
            </div>
        </div>
        
        <div class="actions">
            <button onclick="window.print()" style="padding:10px 20px; background:#A67C00; color:white; border:none; border-radius:5px; cursor:pointer;">
                🖨️ Enregistrer en PDF (Imprimer)
            </button>
            <br>
            ${whatsappLink}
            <p style="font-size: 11px; color: #888; margin-top:10px;">(Astuce: Utilisez la fonction "Imprimer" de votre navigateur et choisissez "Enregistrer au format PDF" pour garder une copie)</p>
        </div>
    </body>
    </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
}

// === MODAL FORM ===
function openNewTaskModal() {
    document.getElementById('task-modal').classList.add('active');
    
    // Charger les tailleurs
    const sel = document.getElementById('task-assignee');
    if(sel) {
        const tailors = JSON.parse(localStorage.getItem('sw_tailors')) || [];
        sel.innerHTML = '<option value="">-- Atelier Général (Tous) --</option>' + tailors.map(t => `<option value="${t.username}">${t.username}</option>`).join('');
    }
}

function closeNewTaskModal() {
    document.getElementById('task-modal').classList.remove('active');
    document.getElementById('new-task-form').reset();
    
    // reset image preview
    currentPhotoBase64 = null;
    const preview = document.getElementById('photo-preview');
    const uploadBox = document.getElementById('file-upload-box');
    if(preview) preview.style.display = 'none';
    if(uploadBox) uploadBox.style.display = 'flex';
}

// Gestion de la photo
let currentPhotoBase64 = null;
const clothPhotoInput = document.getElementById('cloth-photo');
const photoPreview = document.getElementById('photo-preview');
const fileUploadBox = document.getElementById('file-upload-box');

if (clothPhotoInput) {
    clothPhotoInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            // Un lecteur pour convertir en Base64
            const reader = new FileReader();
            reader.onload = function(event) {
                currentPhotoBase64 = event.target.result; // String Base64
                if(photoPreview && fileUploadBox) {
                    photoPreview.src = currentPhotoBase64;
                    photoPreview.style.display = 'block';
                    fileUploadBox.style.display = 'none';
                }
            };
            reader.readAsDataURL(file);
        }
    });
}

const form = document.getElementById('new-task-form');
if(form) {
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const newTask = {
            id: Date.now(),
            client: document.getElementById('client-name').value,
            phone: document.getElementById('client-phone') ? document.getElementById('client-phone').value : '',
            type: document.getElementById('cloth-type').value,
            price: document.getElementById('task-price') ? document.getElementById('task-price').value : '',
            dueDate: document.getElementById('due-date').value,
            step: document.getElementById('initial-step').value,
            assignee: document.getElementById('task-assignee') ? document.getElementById('task-assignee').value : '',
            notes: document.getElementById('task-notes').value,
            photo: currentPhotoBase64 // on enregistre la photo
        };
        
        localTasks.push(newTask);
        await saveTaskToDB(newTask);
        
        printReceipt(newTask);
        
        closeNewTaskModal();
        updateStats();
        if(typeof renderAgenda === "function") renderAgenda();
        if(typeof renderAtelier === "function") renderAtelier();
        if(typeof renderBibliotheque === "function") renderBibliotheque();
    });
}
// Search functionality in Bibliothèque
const searchInput = document.getElementById('search-biblio');
if(searchInput) {
    searchInput.addEventListener('input', (e) => {
        renderBibliotheque(e.target.value);
    });
}

// Search functionality in Boutique
const searchBoutiqueInput = document.getElementById('search-boutique');
if(searchBoutiqueInput) {
    searchBoutiqueInput.addEventListener('input', (e) => {
        if(typeof renderBoutique === "function") renderBoutique(e.target.value);
    });
}

// === NOTIFICATION SYSTEM ===
window.addEventListener('storage', (e) => {
    if (e.key === 'coutureTasks') {
        const user = sessionStorage.getItem('loggedTailor');
        if (!user) return; // Uniquement pour l'espace tailleur

        const oldTasks = JSON.parse(e.oldValue || '[]');
        const newTasks = JSON.parse(e.newValue || '[]');

        const newlyAssigned = newTasks.filter(nt => {
            if (nt.step === 'atelier' && (!nt.assignee || nt.assignee.toLowerCase() === user.toLowerCase())) {
                const ot = oldTasks.find(o => o.id === nt.id);
                if (!ot || ot.step !== 'atelier') return true;
            }
            return false;
        });

        if (newlyAssigned.length > 0) {
            playTailorNotification(user);
            if (typeof renderTailleur === 'function') renderTailleur();
        }
    }
});

function playTailorNotification(username) {
    const customAudio = localStorage.getItem('sw_audio_' + username);
    const audioSrc = customAudio || 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg';
    try {
        const audio = new Audio(audioSrc);
        audio.play().catch(err => console.log('Autorisez la lecture auto du navigateur pour les notifications.', err));
    } catch(err) {
        console.log("Erreur lecture audio", err);
    }
}

// === PWA SERVICE WORKER REGISTRATION ===
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('ServiceWorker enregistré avec succès. PWA active.', registration.scope);
            })
            .catch(error => {
                console.log('Erreur lors de l\'enregistrement du ServiceWorker:', error);
            });
    });
}
