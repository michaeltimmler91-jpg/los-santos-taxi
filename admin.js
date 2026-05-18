let currentUser = null;

async function startAdmin() {
    const savedUser = localStorage.getItem("taxiUser");

    if (!savedUser) {
        location.href = "index.html";
        return;
    }

    currentUser = JSON.parse(savedUser);

    if (currentUser.role !== "admin") {
        document.getElementById("adminAccessDenied").style.display = "block";
        return;
    }

    document.getElementById("adminApp").style.display = "block";
    document.getElementById("adminUserName").innerText = currentUser.display_name;

    await loadAdminStats();
    await loadUsers();
    await loadCompanies();
    await loadTipsStats();
    await loadDealerStats();
    await loadAnnouncements();
    await loadAdminDoneJobs();
    await loadAdminTimeStats();
    await loadDriverProfiles();

    loadDashboardOverview();
    loadAdminStatusUsers();
}

function logoutAdmin() {
    localStorage.removeItem("taxiUser");
    location.href = "index.html";
}

function showAdminTab(tabId) {
    document.querySelectorAll(".admin-tab-content").forEach(tab => {
        tab.style.display = "none";
    });

    document.querySelectorAll(".admin-nav-btn").forEach(btn => {
        btn.classList.remove("active");
    });

    document.getElementById(tabId).style.display = "block";
    event.target.classList.add("active");
}

async function loadAdminStats() {

    const users = await getTaxiUsers();
    const companies = await getTaxiCompanies();
    const jobs = await getTaxiJobs();

    const drivers =
        users.filter(user => user.role === "fahrer").length;

    const companyCount =
        companies.length;

    const openJobs =
        jobs.filter(job => job.job_status === "Offen").length;

    const openTips =
        jobs
            .filter(job =>
                job.job_status === "Erledigt" &&
                job.tip_paid !== true
            )
            .reduce((sum, job) => {
                return sum + Number(job.tip_amount || 0);
            }, 0);

    document.getElementById("adminStatDrivers").innerText =
        drivers;

    document.getElementById("adminStatCompanies").innerText =
        companyCount;

    document.getElementById("adminStatOpenJobs").innerText =
        openJobs;

    document.getElementById("adminStatTips").innerText =
        `${openTips}$`;
}

function loadDashboardOverview() {
    document.getElementById("dashboard_overview").innerHTML = `
        <div class="admin-card">
            <strong>📊 Adminübersicht</strong><br><br>
            Hier kannst du Fahrer, Firmen, Fahrten und Trinkgeld verwalten.<br><br>
            Der Wert <strong>Trinkgeld Gesamt</strong> zeigt jetzt nur noch offenes,
            noch nicht ausgezahltes Trinkgeld.
        </div>
    `;
}

async function createUser() {
    const username = document.getElementById("new_username").value.trim();
    const display_name = document.getElementById("new_display_name").value.trim();
    const password = document.getElementById("new_password").value.trim();
    const role = document.getElementById("new_role").value;

    if (!username || !display_name || !password) {
        alert("Bitte alles ausfüllen.");
        return;
    }

    const { error } = await client
        .from("taxi_users")
        .insert([{ username, display_name, password, role }]);

    if (error) {
        alert("Benutzer konnte nicht erstellt werden.");
        console.error(error);
        return;
    }

    alert("Benutzer erstellt.");

    document.getElementById("new_username").value = "";
    document.getElementById("new_display_name").value = "";
    document.getElementById("new_password").value = "";

    loadUsers();
    loadAdminStats();
}

async function loadUsers() {
    const box = document.getElementById("users_list");
    const data = await getTaxiUsers();

data.sort((a, b) =>
    String(a.company_name || "").localeCompare(
        String(b.company_name || "")
    )
);

    box.innerHTML = "";

    data.forEach(user => {
        box.innerHTML += `
            <div class="admin-card">
                <strong>${escapeHtml(user.display_name)}</strong><br>
                Benutzername: ${escapeHtml(user.username)}<br>
                Rolle: ${escapeHtml(user.role)}

                <div class="admin-actions">
                    <button class="small-btn" onclick="changeRole('${user.id}', '${user.role}')">
                        Rolle ändern
                    </button>

                    <button class="small-btn" onclick="changePassword('${user.id}')">
                        Passwort ändern
                    </button>

                    <button class="small-btn danger-btn" onclick="deleteUser('${user.id}')">
                        Löschen
                    </button>
                </div>
            </div>
        `;
    });
}

async function changeRole(id, currentRole) {
    const newRole = currentRole === "admin" ? "fahrer" : "admin";

    const { error } = await client
        .from("taxi_users")
        .update({ role: newRole })
        .eq("id", id);

    if (error) {
        alert("Rolle konnte nicht geändert werden.");
        console.error(error);
        return;
    }

    loadUsers();
    loadAdminStats();
}

async function changePassword(id) {
    const newPassword = prompt("Neues Passwort:");

    if (!newPassword) return;

    const { error } = await client
        .from("taxi_users")
        .update({ password: newPassword })
        .eq("id", id);

    if (error) {
        alert("Passwort konnte nicht geändert werden.");
        console.error(error);
        return;
    }

    alert("Passwort geändert.");
}

async function deleteUser(id) {
    const ok = confirm("Benutzer wirklich löschen?");
    if (!ok) return;

    const { error } = await client
        .from("taxi_users")
        .delete()
        .eq("id", id);

    if (error) {
        alert("Benutzer konnte nicht gelöscht werden.");
        console.error(error);
        return;
    }

    loadUsers();
    loadAdminStats();
}

async function createCompany() {
    const company_name = document.getElementById("new_company_name").value.trim();
    const themeColor = document.getElementById("new_company_color").value;

    if (!company_name) {
        alert("Bitte Firmenname eingeben.");
        return;
    }

    const { error } = await client
        .from("taxi_companies")
        .insert([{ company_name, theme_color: themeColor, active: true }]);

    if (error) {
        alert("Firma konnte nicht erstellt werden.");
        console.error(error);
        return;
    }

    document.getElementById("new_company_name").value = "";

    loadCompanies();
    loadAdminStats();
}

async function loadCompanies() {
    const box = document.getElementById("companies_list");
    const data = await getTaxiCompanies();

data.sort((a, b) =>
    String(a.display_name || "").localeCompare(
        String(b.display_name || "")
    )
);

    box.innerHTML = "";

    data.forEach(company => {

        const companyLink = `https://los-santos-taxi.michaeltimmler91.workers.dev/firma.html?id=${company.id}`;

        box.innerHTML += `
            <div class="admin-card">

                <div
                    style="
                        display:flex;
                        justify-content:space-between;
                        gap:20px;
                        align-items:flex-start;
                        flex-wrap:wrap;
                    "
                >

                    <div>

                        <strong>
                            ${escapeHtml(company.company_name || "Unbekannte Firma")}
                        </strong>

                        <br>

                        🎨 Farbe:
                        <strong>
                            ${escapeHtml(company.theme_color || "yellow")}
                        </strong>

                        <br>

                        🔑 Firmen-Code:
                        <strong>
                            ${escapeHtml(
                                company.company_code && company.company_code.trim() !== ""
                                    ? company.company_code
                                    : "Kein Code gesetzt"
                            )}
                        </strong>

                        <br><br>

                        🔗 Firmenlink:

                        <br>

                        <input
                            type="text"
                            readonly
                            value="${companyLink}"
                        >

                    </div>

                    <div class="admin-actions">

                        <button
                            class="small-btn"
                            onclick="copyCompanyLink('${escapeAttr(companyLink)}')"
                        >
                            📋 Link kopieren
                        </button>

                        <button
                            class="small-btn"
                            onclick="editCompany('${company.id}', '${escapeAttr(company.company_name)}')"
                        >
                            Namen ändern
                        </button>

                        <button
                            class="small-btn"
                            onclick="editCompanyCode('${company.id}', '${escapeAttr(company.company_code || "")}')"
                        >
                            Code ändern
                        </button>

                        <button
                            class="small-btn"
                            onclick="editCompanyColor('${company.id}', '${escapeAttr(company.theme_color || "yellow")}')"
                        >
                            Farbe ändern
                        </button>

                        <button
                            class="small-btn danger-btn"
                            onclick="deleteCompany('${company.id}')"
                        >
                            Löschen
                        </button>

                    </div>

                </div>

            </div>
        `;
    });
}

async function editCompanyCode(id, oldCode) {
    const newCode = prompt("Neuer Firmen-Code:", oldCode);

    if (newCode === null) return;

    const { error } = await client
        .from("taxi_companies")
        .update({
            company_code: newCode.trim()
        })
        .eq("id", id);

    if (error) {
        alert("Firmen-Code konnte nicht geändert werden.");
        console.error(error);
        return;
    }

    alert("Firmen-Code gespeichert.");
    loadCompanies();
}

async function editCompany(id, oldName) {
    const newName = prompt("Neuer Firmenname:", oldName);

    if (!newName) return;

    const { error } = await client
        .from("taxi_companies")
        .update({ company_name: newName })
        .eq("id", id);

    if (error) {
        alert("Firma konnte nicht bearbeitet werden.");
        console.error(error);
        return;
    }

    loadCompanies();
}

async function deleteCompany(id) {
    const ok = confirm("Firma wirklich löschen?");
    if (!ok) return;

    const { error } = await client
        .from("taxi_companies")
        .delete()
        .eq("id", id);

    if (error) {
        alert("Firma konnte nicht gelöscht werden.");
        console.error(error);
        return;
    }

    loadCompanies();
    loadAdminStats();
}

async function loadTipsStats() {
    const data = await getDoneJobs(500);

    const grouped = {};

    data.forEach(job => {
        const driver = job.assigned_driver || "Unbekannt";

        if (!grouped[driver]) {
            grouped[driver] = {
                rides: 0,
                openTips: 0,
                paidTips: 0,
                totalTips: 0,
                fares: 0,
                invoices: 0,
                food: 0
            };
        }

        const tip = Number(job.tip_amount || 0);

        grouped[driver].rides++;
        grouped[driver].totalTips += tip;

        if (job.tip_paid === true) {
            grouped[driver].paidTips += tip;
        } else {
            grouped[driver].openTips += tip;
        }

        grouped[driver].fares += Number(job.fare_amount || 0);
        grouped[driver].invoices += Number(job.invoice_amount || 0);
        grouped[driver].food += Number(job.food_cost || 0);
    });

    const html = Object.entries(grouped).map(([driver, stats]) => `
        <div class="admin-card">
            <strong>${escapeHtml(driver)}</strong><br><br>

            🚕 Fahrten gesamt: ${stats.rides}<br>
            🎁 Offenes Trinkgeld: <strong>${stats.openTips}$</strong><br>
            💸 Bereits ausgezahlt: ${stats.paidTips}$<br>
            📦 Trinkgeld gesamt: ${stats.totalTips}$<br>
            💰 Fahrtkosten: ${stats.fares}$<br>
            🧾 Rechnungen: ${stats.invoices}$<br>
            🍔 Essenskosten: ${stats.food}$

            <div class="admin-actions">
                <button
                    class="small-btn danger-btn"
                    onclick="payTipsForDriver('${escapeAttr(driver)}', ${stats.openTips})"
                    ${stats.openTips <= 0 ? "disabled" : ""}
                >
                    💸 Trinkgeld auszahlen
                </button>
            </div>
        </div>
    `).join("");

    document.getElementById("tips_stats").innerHTML = html || "Keine Daten vorhanden.";
    document.getElementById("tips_stats_full").innerHTML = html || "Keine Daten vorhanden.";
}

async function payTipsForDriver(driverName, amount) {
    if (amount <= 0) {
        alert("Dieser Fahrer hat kein offenes Trinkgeld.");
        return;
    }

    const ok = confirm(
        `Offenes Trinkgeld für ${driverName} wirklich als ausgezahlt markieren?\n\nBetrag: ${amount}$`
    );

    if (!ok) return;

    const { error } = await client
        .from("taxi_jobs")
        .update({ tip_paid: true })
        .eq("job_status", "Erledigt")
        .eq("assigned_driver", driverName)
        .neq("tip_paid", true);

    if (error) {
        alert("Trinkgeld konnte nicht ausgezahlt werden.");
        console.error(error);
        return;
    }

    alert(`Trinkgeld für ${driverName} wurde als ausgezahlt markiert.`);

    await loadTipsStats();
    await loadAdminStats();
}

async function loadAdminDoneJobs() {
    const data = await getDoneJobs(50);

    const html = data.map(job => `
        <div class="admin-card">
            <strong>${escapeHtml(job.assigned_driver || "-")}</strong><br><br>

            🚕 Fahrtart: ${escapeHtml(job.ride_type || "-")}<br>
            👤 Kunde/Empfänger: ${escapeHtml(job.customer_name || "-")}<br>
            📍 Strecke: ${escapeHtml(job.pickup_location || "-")} → ${escapeHtml(job.destination || "-")}<br>
            🚕 KM: ${job.kilometers || 0}<br>
            💰 Fahrtkosten: ${job.fare_amount || 0}$<br>
            🧾 Rechnung: ${job.invoice_amount || 0}$<br>
            🎁 Trinkgeld: ${job.tip_amount || 0}$<br>
            💸 Trinkgeldstatus: ${job.tip_paid === true ? "Ausgezahlt" : "Offen"}<br>
            🍔 Essenskosten: ${job.food_cost || 0}$<br>
            📝 Notiz: ${escapeHtml(job.notes || "-")}

            <div class="admin-actions">
                <button class="small-btn" onclick="toggleJobEdit('${job.id}')">
                    Bearbeiten
                </button>

                <button class="small-btn danger-btn" onclick="deleteJob('${job.id}')">
                    Löschen
                </button>
            </div>

            <div id="edit_job_${job.id}" style="display:none; margin-top:18px;">
                <div class="form-grid">
                    <div class="field">
                        <label>Kunde / Empfänger</label>
                        <input type="text" id="edit_customer_${job.id}" value="${escapeAttr(job.customer_name || "")}">
                    </div>

                    <div class="field">
                        <label>Start / Abholung</label>
                        <input type="text" id="edit_pickup_${job.id}" value="${escapeAttr(job.pickup_location || "")}">
                    </div>

                    <div class="field">
                        <label>Ziel</label>
                        <input type="text" id="edit_destination_${job.id}" value="${escapeAttr(job.destination || "")}">
                    </div>

                    <div class="field">
                        <label>Kilometer</label>
                        <input type="number" id="edit_km_${job.id}" value="${job.kilometers || 0}">
                    </div>

                    <div class="field">
                        <label>Ausgestellte Rechnung</label>
                        <input type="number" id="edit_invoice_${job.id}" value="${job.invoice_amount || 0}">
                    </div>

                    <div class="field">
                        <label>Essenskosten</label>
                        <input type="number" id="edit_food_${job.id}" value="${job.food_cost || 0}">
                    </div>

                    <div class="field">
                        <label>Trinkgeld ausgezahlt?</label>
                        <select id="edit_tip_paid_${job.id}">
                            <option value="false" ${job.tip_paid !== true ? "selected" : ""}>Nein</option>
                            <option value="true" ${job.tip_paid === true ? "selected" : ""}>Ja</option>
                        </select>
                    </div>

                    <div class="field">
                        <label>Notiz</label>
                        <input type="text" id="edit_notes_${job.id}" value="${escapeAttr(job.notes || "")}">
                    </div>
                </div>

                <button onclick="saveJobEdit('${job.id}', '${job.ride_type}')">
                    Änderungen speichern
                </button>
            </div>
        </div>
    `).join("");

document.getElementById("admin_done_jobs").innerHTML =
    html || "Keine erledigten Fahrten.";

document.getElementById("admin_done_jobs_full").innerHTML =
    html
        .replaceAll('id="edit_job_', 'id="full_edit_job_')
        .replaceAll('id="edit_customer_', 'id="full_edit_customer_')
        .replaceAll('id="edit_pickup_', 'id="full_edit_pickup_')
        .replaceAll('id="edit_destination_', 'id="full_edit_destination_')
        .replaceAll('id="edit_km_', 'id="full_edit_km_')
        .replaceAll('id="edit_invoice_', 'id="full_edit_invoice_')
        .replaceAll('id="edit_food_', 'id="full_edit_food_')
        .replaceAll('id="edit_tip_paid_', 'id="full_edit_tip_paid_')
        .replaceAll('id="edit_notes_', 'id="full_edit_notes_')
        .replaceAll("toggleJobEdit('", "toggleFullJobEdit('")
        || "Keine erledigten Fahrten.";
}

function toggleFullJobEdit(id) {
    const box = document.getElementById(`full_edit_job_${id}`);
    if (!box) return;

    box.style.display =
        box.style.display === "none"
            ? "block"
            : "none";
}

function toggleJobEdit(id) {
    const box = document.getElementById(`edit_job_${id}`);
    if (!box) return;

    box.style.display = box.style.display === "none" ? "block" : "none";
}

function recalculateJob(rideType, km, invoice, food) {
    let fare = km * 5;
    let tip = 0;
    let billedTo = "Kunde";

    if (rideType === "Bambi-Tour") {
        fare = 0;
        billedTo = "Kostenlos";
        tip = invoice;
    }

    if (rideType === "Normale Fahrt") {
        tip = invoice - fare;
    }

    if (rideType === "Essenslieferung") {
        tip = invoice - food - fare;
    }

    if (rideType === "EMS") {
        billedTo = "EMS";
        tip = invoice;
    }

    if (rideType === "Gebrauchtwagenhändler") {
        billedTo = "Gebrauchtwagenhändler";
        tip = invoice;
    }

    return {
        fare,
        tip,
        billedTo
    };
}

async function saveJobEdit(id, rideType) {
    const customer = document.getElementById(`edit_customer_${id}`).value.trim();
    const pickup = document.getElementById(`edit_pickup_${id}`).value.trim();
    const destination = document.getElementById(`edit_destination_${id}`).value.trim();
    const km = Number(document.getElementById(`edit_km_${id}`).value);
    const invoice = Number(document.getElementById(`edit_invoice_${id}`).value);
    const food = Number(document.getElementById(`edit_food_${id}`).value);
    const tipPaid = document.getElementById(`edit_tip_paid_${id}`).value === "true";
    const notes = document.getElementById(`edit_notes_${id}`).value.trim();

    if (!pickup || !destination) {
        alert("Start und Ziel müssen eingetragen sein.");
        return;
    }

    if (km < 0 || invoice < 0 || food < 0) {
        alert("Negative Werte sind nicht erlaubt.");
        return;
    }

    const result = recalculateJob(rideType, km, invoice, food);

    const { error } = await client
        .from("taxi_jobs")
        .update({
            customer_name: customer,
            pickup_location: pickup,
            destination: destination,
            kilometers: km,
            fare_amount: result.fare,
            invoice_amount: invoice,
            tip_amount: result.tip,
            food_cost: food,
            tip_paid: tipPaid,
            billed_to: result.billedTo,
            notes: notes
        })
        .eq("id", id);

    if (error) {
        alert("Fahrt konnte nicht gespeichert werden.");
        console.error(error);
        return;
    }

    alert("Fahrt gespeichert.");

    await loadAdminDoneJobs();
    await loadTipsStats();
    await loadAdminStats();
}

async function deleteJob(id) {
    const ok = confirm("Fahrt wirklich endgültig löschen?");
    if (!ok) return;

    const { error } = await client
        .from("taxi_jobs")
        .delete()
        .eq("id", id);

    if (error) {
        alert("Fahrt konnte nicht gelöscht werden.");
        console.error(error);
        return;
    }

    await loadAdminDoneJobs();
    await loadAdminStats();
    await loadTipsStats();
}




async function editCompanyColor(id, oldColor) {

    const newColor = prompt(
        "Neue Firmenfarbe:",
        oldColor || "yellow"
    );

    if (newColor === null) return;

    const { error } = await client
        .from("taxi_companies")
        .update({
            theme_color: newColor.trim()
        })
        .eq("id", id);

    if (error) {
        console.error(error);
        alert("Farbe konnte nicht gespeichert werden.");
        return;
    }

    loadCompanies();
}

function copyCompanyLink(link) {

    navigator.clipboard.writeText(link);

    alert("Firmenlink kopiert.");
}
async function loadDealerStats() {
    const box = document.getElementById("dealer_stats");

    if (!box) return;

    const { data, error } = await client
        .from("taxi_jobs")
        .select("*")
        .eq("ride_type", "Gebrauchtwagenhändler")
        .eq("job_status", "Erledigt")
        .neq("dealer_paid", true)
        .order("completed_at", { ascending: false });

    if (error) {
        console.error(error);
        box.innerHTML = "Fehler beim Laden.";
        return;
    }

    if (!data || data.length === 0) {
        box.innerHTML = `
            <div class="admin-card">
                Keine offenen Händlerfahrten vorhanden.
            </div>
        `;
        return;
    }

    const total = data.reduce((sum, job) => {
        return sum + Number(job.invoice_amount || 0);
    }, 0);

    let html = `
        <div class="admin-card">
            <strong>Offene Monatssumme</strong><br><br>
            <span style="font-size:42px;color:#facc15;font-weight:900;">
                ${total}$
            </span>
            <br><br>
            🚗 Offene Fahrten: ${data.length}
        </div>
    `;

    data.forEach(job => {
        html += `
            <div class="admin-card">
                <strong>${escapeHtml(job.assigned_driver || "-")}</strong><br><br>

                👤 Kunde: ${escapeHtml(job.customer_name || "-")}<br>
                📍 Strecke: ${escapeHtml(job.pickup_location || "-")} → ${escapeHtml(job.destination || "-")}<br>
                🚕 KM: ${job.kilometers || 0}<br>
                🧾 Rechnung: ${job.invoice_amount || 0}$<br>
                📝 Notiz: ${escapeHtml(job.notes || "-")}
            </div>
        `;
    });

    box.innerHTML = html;
}

async function payDealerMonth() {
    const ok = confirm(
        "Alle offenen Gebrauchtwagenhändler-Fahrten wirklich als bezahlt markieren?"
    );

    if (!ok) return;

    const { error } = await client
        .from("taxi_jobs")
        .update({
    dealer_paid: true,
    dealer_paid_at: new Date().toISOString()
})
        .eq("ride_type", "Gebrauchtwagenhändler")
        .eq("job_status", "Erledigt")
        .neq("dealer_paid", true);

    if (error) {
        console.error(error);
        alert("Abrechnung konnte nicht zurückgesetzt werden.");
        return;
    }

    alert("Händlerabrechnung wurde zurückgesetzt.");

    await loadDealerStats();
    await loadAdminStats();
}

async function createAnnouncement() {
    const title = document.getElementById("announcement_title").value.trim();
    const message = document.getElementById("announcement_message").value.trim();
    const mustConfirm = document.getElementById("announcement_confirm").value === "true";

    if (!title || !message) {
        alert("Bitte Titel und Nachricht eintragen.");
        return;
    }

    const { error } = await client
        .from("taxi_announcements")
        .insert([{
            title,
            message,
            active: true,
            must_confirm: mustConfirm
        }]);

    if (error) {
        console.error(error);
        alert("Info konnte nicht erstellt werden.");
        return;
    }

    document.getElementById("announcement_title").value = "";
    document.getElementById("announcement_message").value = "";
    document.getElementById("announcement_confirm").value = "true";

    await loadAnnouncements();
}

async function loadAnnouncements() {
    const box = document.getElementById("announcements_list");
    const data = await getAnnouncements();

    if (!data || data.length === 0) {
        box.innerHTML = `
            <div class="admin-card">
                Keine Infos vorhanden.
            </div>
        `;
        return;
    }

    box.innerHTML = "";

    for (const info of data) {
        const reads = await loadAnnouncementReads(info.id);

        box.innerHTML += `
            <div class="admin-card">
                <strong>${escapeHtml(info.title)}</strong><br><br>

                ${escapeHtml(info.message).replaceAll("\n", "<br>")}

                <br><br>

                Status:
                <strong>${info.active ? "Aktiv" : "Inaktiv"}</strong><br>

                Pflicht:
                <strong>${info.must_confirm ? "Ja" : "Nein"}</strong><br>

                Bestätigt von:
                <strong>${reads.length}</strong>

                <div style="margin-top:12px;color:#cbd5e1;">
                    ${reads.length > 0
                        ? reads.map(r => `✅ ${escapeHtml(r.display_name)}`).join("<br>")
                        : "Noch niemand bestätigt."
                    }
                </div>

                <div class="admin-actions">
                    <button
                        class="small-btn secondary-btn"
                        onclick="toggleAnnouncement('${info.id}', ${info.active})"
                    >
                        ${info.active ? "Deaktivieren" : "Aktivieren"}
                    </button>

                    <button
                        class="small-btn danger-btn"
                        onclick="deleteAnnouncement('${info.id}')"
                    >
                        Löschen
                    </button>
                </div>
            </div>
        `;
    }
}

async function loadAnnouncementReads(announcementId) {
    const { data, error } = await client
        .from("taxi_announcement_reads")
        .select("*")
        .eq("announcement_id", announcementId)
        .order("display_name");

    if (error) {
        console.error(error);
        return [];
    }

    return data || [];
}

async function toggleAnnouncement(id, active) {
    const { error } = await client
        .from("taxi_announcements")
        .update({
            active: !active
        })
        .eq("id", id);

    if (error) {
        console.error(error);
        alert("Status konnte nicht geändert werden.");
        return;
    }

    await loadAnnouncements();
}

async function deleteAnnouncement(id) {
    const ok = confirm("Info wirklich löschen?");

    if (!ok) return;

    const { error } = await client
        .from("taxi_announcements")
        .delete()
        .eq("id", id);

    if (error) {
        console.error(error);
        alert("Info konnte nicht gelöscht werden.");
        return;
    }

    await loadAnnouncements();
}
async function loadAdminTimeStats() {

    const box = document.getElementById("admin_time_stats");

    if (!box) return;

    const { data: users, error: usersError } = await client
        .from("taxi_users")
        .select("username, display_name, role")
        .in("role", ["fahrer", "admin"]);

    if (usersError) {
        console.error(usersError);
        box.innerHTML = "Fehler beim Laden der Fahrer.";
        return;
    }

    const activeUsers = {};

    (users || []).forEach(user => {
        activeUsers[user.username] = user.display_name;
    });

    const { data, error } = await client
        .from("taxi_status_logs")
        .select("*")
        .order("created_at", { ascending: true });

    if (error) {
        console.error(error);
        box.innerHTML = "Fehler";
        return;
    }

    const { data: absences, error: absencesError } = await client
        .from("taxi_driver_absences")
        .select("*")
        .eq("active", true);

    if (absencesError) {
        console.error(absencesError);
    }

    const now = new Date();

    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);

    const startWeek = new Date();
    const day = startWeek.getDay();
    const diff = day === 0 ? 6 : day - 1;

    startWeek.setDate(startWeek.getDate() - diff);
    startWeek.setHours(0, 0, 0, 0);

    const startMonth = new Date();
    startMonth.setDate(1);
    startMonth.setHours(0, 0, 0, 0);

    const groupedLogs = {};

    Object.keys(activeUsers).forEach(username => {
        groupedLogs[username] = {
            username: username,
            display_name: activeUsers[username],
            logs: []
        };
    });

    (data || []).forEach(log => {
        if (!activeUsers[log.username]) return;

        groupedLogs[log.username].logs.push(log);
    });

    const rows = Object.values(groupedLogs).map(driver => {
        const stats = {
            username: driver.username,
            display_name: driver.display_name,

            todayDuty: 0,
            todayPause: 0,

            weekDuty: 0,
            weekPause: 0,

            monthDuty: 0,
            monthPause: 0,

            totalDuty: 0,
            totalPause: 0,

            lastSeen: null,
            lastStatus: "Unbekannt",
            absenceText: "",
            inactiveWarning: false
        };

        if (driver.logs.length > 0) {
            const lastLog = driver.logs[driver.logs.length - 1];

            stats.lastSeen = new Date(lastLog.created_at);
            stats.lastStatus = lastLog.new_status || "Unbekannt";
        }

        const activeAbsence = (absences || []).find(absence => {
            if (absence.username !== driver.username) return false;

            const start = new Date(absence.start_date);
            const end = new Date(absence.end_date);
            end.setHours(23, 59, 59, 999);

            return now >= start && now <= end;
        });

        if (activeAbsence) {
            const endDate = new Date(activeAbsence.end_date);

            stats.absenceText =
                "🏖️ Urlaub bis " +
                endDate.toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit"
                });
        }

        if (!stats.absenceText && stats.lastSeen) {
            const daysInactive =
                Math.floor((now - stats.lastSeen) / 1000 / 60 / 60 / 24);

            if (daysInactive >= 7) {
                stats.inactiveWarning = true;
                stats.absenceText = `⚠️ Seit ${daysInactive} Tagen nicht aktiv`;
            }
        }

        for (let i = 0; i < driver.logs.length; i++) {
            const current = driver.logs[i];
            const next = driver.logs[i + 1];

            const start = new Date(current.created_at);
            const end = next
                ? new Date(next.created_at)
                : now;

            if (end <= start) continue;

            addStatusTime(stats, current.new_status, start, end, startToday, "today");
            addStatusTime(stats, current.new_status, start, end, startWeek, "week");
            addStatusTime(stats, current.new_status, start, end, startMonth, "month");

            const totalSeconds = Math.floor((end - start) / 1000);

            if (current.new_status === "Im Dienst") {
                stats.totalDuty += totalSeconds;
            }

            if (current.new_status === "Pause") {
                stats.totalPause += totalSeconds;
            }
        }

        return stats;
    });

    if (rows.length === 0) {
        box.innerHTML = `
            <div class="admin-card">
                Noch keine Dienstzeiten vorhanden.
            </div>
        `;
        return;
    }

    box.innerHTML = `
        <div class="admin-time-table admin-time-table-wide">

            <div class="admin-time-head admin-time-head-wide">
                <div>Fahrer</div>
                <div>Heute</div>
                <div>Woche</div>
                <div>Monat</div>
                <div>Gesamt</div>
            </div>

            ${rows.map(driver => `
                <div class="admin-time-row admin-time-row-wide ${driver.inactiveWarning ? "driver-inactive-row" : ""}">

                    <div class="admin-driver-name-cell">
                        <strong>${escapeHtml(driver.display_name)}</strong>

                        <small>
                            ${driver.absenceText
                                ? escapeHtml(driver.absenceText)
                                : driver.lastSeen
                                    ? "🕓 Zuletzt aktiv: " + formatLastSeen(driver.lastSeen)
                                    : "🕓 Noch keine Aktivität"
                            }
                        </small>
                    </div>

                    <div>
                        🟢 ${formatSeconds(driver.todayDuty)}<br>
                        🟡 ${formatSeconds(driver.todayPause)}
                    </div>

                    <div>
                        🟢 ${formatSeconds(driver.weekDuty)}<br>
                        🟡 ${formatSeconds(driver.weekPause)}
                    </div>

                    <div>
                        🟢 ${formatSeconds(driver.monthDuty)}<br>
                        🟡 ${formatSeconds(driver.monthPause)}
                    </div>

                    <div>
                        🟢 ${formatSeconds(driver.totalDuty)}<br>
                        🟡 ${formatSeconds(driver.totalPause)}
                    </div>

                </div>
            `).join("")}

        </div>
    `;
}

function addStatusTime(stats, status, start, end, rangeStart, key) {

    if (end <= rangeStart) return;

    const effectiveStart =
        start < rangeStart
            ? rangeStart
            : start;

    const seconds =
        Math.floor((end - effectiveStart) / 1000);

    if (seconds <= 0) return;

    if (status === "Im Dienst") {
        stats[`${key}Duty`] += seconds;
    }

    if (status === "Pause") {
        stats[`${key}Pause`] += seconds;
    }
}

function formatLastSeen(date) {
    const now = new Date();

    const diffMinutes =
        Math.floor((now - date) / 1000 / 60);

    if (diffMinutes < 1) {
        return "gerade eben";
    }

    if (diffMinutes < 60) {
        return `vor ${diffMinutes} Min`;
    }

    const diffHours =
        Math.floor(diffMinutes / 60);

    if (diffHours < 24) {
        return `vor ${diffHours} Std`;
    }

    const diffDays =
        Math.floor(diffHours / 24);

    if (diffDays < 7) {
        return `vor ${diffDays} Tagen`;
    }

    return date.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}
async function loadAdminStatusUsers() {
    const select = document.getElementById("admin_status_user");

    if (!select) return;

    const { data, error } = await client
        .from("taxi_users")
        .select("username, display_name, role")
        .in("role", ["fahrer", "admin"])
        .order("display_name", { ascending: true });

    if (error) {
        console.error(error);
        return;
    }

    select.innerHTML = "";

    (data || []).forEach(user => {
        select.innerHTML += `
            <option value="${escapeAttr(user.username)}" data-name="${escapeAttr(user.display_name)}">
                ${escapeHtml(user.display_name)}
            </option>
        `;
    });
}

async function adminChangeDriverStatus() {
    const userSelect = document.getElementById("admin_status_user");
    const statusSelect = document.getElementById("admin_status_value");
    const result = document.getElementById("admin_status_result");

    const username = userSelect.value;
    const displayName = userSelect.options[userSelect.selectedIndex].dataset.name;
    const newStatus = statusSelect.value;

    const ok = confirm(`${displayName} wirklich auf "${newStatus}" setzen?`);

    if (!ok) return;

    const { data: oldData } = await client
        .from("taxi_driver_status")
        .select("*")
        .eq("username", username)
        .maybeSingle();

    const oldStatus = oldData ? oldData.status : "Unbekannt";

    const { error } = await client
        .from("taxi_driver_status")
        .upsert({
            username: username,
            display_name: displayName,
            status: newStatus,
            updated_at: new Date().toISOString()
        }, {
            onConflict: "username"
        });

    if (error) {
        console.error(error);
        result.innerHTML = "❌ Status konnte nicht geändert werden.";
        return;
    }

    await client
        .from("taxi_status_logs")
        .insert([{
            username: username,
            display_name: displayName,
            old_status: oldStatus,
            new_status: newStatus
        }]);

    if (newStatus === "Offline") {
        await client
            .from("taxi_dispatchers")
            .update({ active: false })
            .eq("username", username)
            .eq("active", true);
    }

    result.innerHTML = `
        <div class="admin-card success-card">
            <strong>✅ Status geändert</strong><br>
            ${escapeHtml(displayName)} ist jetzt: ${escapeHtml(newStatus)}
        </div>
    `;

    if (typeof loadAdminTimeStats === "function") {
        loadAdminTimeStats();
    }
}
async function loadDriverProfiles() {

    const box =
        document.getElementById("admin_profiles_list");

    if (!box) return;

    const { data, error } = await client
        .from("taxi_driver_profiles")
        .select("*")
        .order("display_name", {
            ascending: true
        });

    if (error) {
        console.error(error);

        box.innerHTML = `
            <div class="admin-card">
                Fehler beim Laden der Profile.
            </div>
        `;

        return;
    }

    if (!data || data.length === 0) {

        box.innerHTML = `
            <div class="admin-card">
                Keine Fahrerprofile vorhanden.
            </div>
        `;

        return;
    }

    box.innerHTML =
        data.map(profile => {

            const publicLink =
                `profil.html?fahrer=${encodeURIComponent(profile.username)}`;

            return `
                <div class="admin-card profile-admin-card">

                    <div class="profile-admin-left">

                        ${
                            profile.profile_image_url
                                ? `
                                    <img
                                        src="${escapeAttr(profile.profile_image_url)}"
                                        class="profile-admin-avatar"
                                        alt="Profilbild"
                                    >
                                `
                                : `
                                    <div class="profile-admin-avatar-placeholder">
                                        🚕
                                    </div>
                                `
                        }

                        <div>

                            <strong>
                                ${escapeHtml(profile.display_name)}
                            </strong>

                            <br>

                            👤 Username:
                            ${escapeHtml(profile.username)}

                            <br>

                            📅 Beim Taxi seit:
                            ${
                                profile.taxi_since
                                    ? new Date(profile.taxi_since)
                                        .toLocaleDateString("de-DE")
                                    : "-"
                            }

                            <br>

                            🌍 Öffentlich:
                            ${
                                profile.public_visible
                                    ? "Ja"
                                    : "Nein"
                            }

                        </div>

                    </div>

                    <div class="admin-actions">

                        <a
                            href="${publicLink}"
                            target="_blank"
                        >
                            <button class="small-btn">
                                👁️ Profil öffnen
                            </button>
                        </a>

                        <button
                            class="small-btn secondary-btn"
                            onclick="toggleProfileVisibility(
                                '${escapeAttr(profile.username)}',
                                ${profile.public_visible}
                            )"
                        >
                            ${
                                profile.public_visible
                                    ? "🙈 Verstecken"
                                    : "👁️ Sichtbar"
                            }
                        </button>
                        <button class="small-btn secondary-btn" onclick="toggleDriverReviews('${escapeAttr(profile.username)}')" >
                            ⭐ Bewertungen
                        </button>
                        <button
                            class="small-btn"
                            onclick="changeTaxiSince(
                                '${escapeAttr(profile.username)}',
                                '${escapeAttr(profile.taxi_since || "")}'
                            )"
                        >
                            📅 Taxi-Beitritt
                        </button>

                    </div>
                    <div
    id="reviews_${escapeAttr(profile.username)}"
    class="profile-admin-reviews"
    style="display:none;margin-top:16px;"
></div>

                </div>
            `;

        }).join("");
}

async function toggleProfileVisibility(
    username,
    current
) {

    const { error } = await client
        .from("taxi_driver_profiles")
        .update({
            public_visible: !current
        })
        .eq("username", username);

    if (error) {
        console.error(error);
        alert("Profil konnte nicht geändert werden.");
        return;
    }

    loadDriverProfiles();
}

async function changeTaxiSince(
    username,
    current
) {

    const newDate =
        prompt(
            "Seit wann beim Taxi? (YYYY-MM-DD)",
            current || ""
        );

    if (newDate === null) {
        return;
    }

    const { error } = await client
        .from("taxi_driver_profiles")
        .update({
            taxi_since: newDate || null
        })
        .eq("username", username);

    if (error) {
        console.error(error);
        alert("Datum konnte nicht gespeichert werden.");
        return;
    }

    loadDriverProfiles();
}
async function toggleDriverReviews(username) {
    const box = document.getElementById(`reviews_${username}`);

    if (!box) return;

    if (box.style.display === "block") {
        box.style.display = "none";
        return;
    }

    box.style.display = "block";
    box.innerHTML = "Lädt...";

    await loadDriverReviewsAdmin(username);
}

async function loadDriverReviewsAdmin(username) {
    const box = document.getElementById(`reviews_${username}`);

    if (!box) return;

    const { data, error } = await client
        .from("taxi_driver_reviews")
        .select("*")
        .eq("driver_username", username)
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        box.innerHTML = "Fehler beim Laden.";
        return;
    }

    if (!data || data.length === 0) {
        box.innerHTML = `
            <div class="admin-card">
                Keine Bewertungen vorhanden.
            </div>
        `;
        return;
    }

    box.innerHTML = data.map(review => `
        <div class="admin-card">
            <strong>${escapeHtml(review.reviewer_name || "Anonym")}</strong><br>
            ⭐ ${review.rating || 0}/5<br><br>

            ${escapeHtml(review.review_text || "-")}

            ${review.driver_reply ? `
                <br><br>
                <div class="admin-card">
                    <strong>Antwort vom Fahrer:</strong><br>
                    ${escapeHtml(review.driver_reply)}
                </div>
            ` : ""}

            <div class="admin-actions">
                <button
                    class="small-btn danger-btn"
                    onclick="deleteDriverReview('${escapeAttr(review.id)}', '${escapeAttr(username)}')"
                >
                    🗑️ Bewertung löschen
                </button>
            </div>
        </div>
    `).join("");
}

async function deleteDriverReview(id, username) {
    const ok = confirm("Bewertung wirklich löschen?");

    if (!ok) return;

    const { error } = await client
        .from("taxi_driver_reviews")
        .delete()
        .eq("id", id);

    if (error) {
        console.error(error);
        alert("Bewertung konnte nicht gelöscht werden.");
        return;
    }

    await loadDriverReviewsAdmin(username);
}

startAdmin();
