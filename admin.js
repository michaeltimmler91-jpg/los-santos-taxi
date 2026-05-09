const SUPABASE_URL = "https://unkfqoplynwabulnzpar.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_AkIVrLBsgIV2jYJ5gGsBmw_f7P62KTK";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
    await loadAdminDoneJobs();

    loadDashboardOverview();
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
    const { data: users } = await client.from("taxi_users").select("*");
    const { data: companies } = await client.from("taxi_companies").select("*");
    const { data: jobs } = await client.from("taxi_jobs").select("*");

    const drivers = (users || []).filter(user => user.role === "fahrer").length;
    const companyCount = (companies || []).length;
    const openJobs = (jobs || []).filter(job => job.job_status === "Offen").length;

    const openTips = (jobs || [])
        .filter(job => job.job_status === "Erledigt" && job.tip_paid !== true)
        .reduce((sum, job) => sum + Number(job.tip_amount || 0), 0);

    document.getElementById("adminStatDrivers").innerText = drivers;
    document.getElementById("adminStatCompanies").innerText = companyCount;
    document.getElementById("adminStatOpenJobs").innerText = openJobs;
    document.getElementById("adminStatTips").innerText = `${openTips}$`;
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

    const { data, error } = await client
        .from("taxi_users")
        .select("*")
        .order("display_name");

    if (error) {
        console.error(error);
        return;
    }

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

    const { data, error } = await client
        .from("taxi_companies")
        .select("*")
        .order("company_name");

    if (error) {
        console.error(error);
        return;
    }

    box.innerHTML = "";

    data.forEach(company => {

        const companyLink =
            `https://los-santos-taxi.michaeltimmler91.workers.dev/firma.html?firma=${encodeURIComponent(company.company_name)}`;

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
                            ${escapeHtml(company.company_name)}
                        </strong>

                        <br>

                        🎨 Farbe:
                        <strong>
                            ${escapeHtml(company.theme_color || "yellow")}
                        </strong>

                        <br>

                        🔑 Firmen-Code:
                        <strong>
                            ${escapeHtml(company.company_code || "Kein Code gesetzt")}
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
    const { data, error } = await client
        .from("taxi_jobs")
        .select("*")
        .eq("job_status", "Erledigt");

    if (error) {
        console.error(error);
        return;
    }

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
    const { data, error } = await client
        .from("taxi_jobs")
        .select("*")
        .in("job_status", ["Erledigt", "Nicht angetroffen"])
        .order("completed_at", { ascending: false })
        .limit(50);

    if (error) {
        console.error(error);
        return;
    }

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

    document.getElementById("admin_done_jobs").innerHTML = html || "Keine erledigten Fahrten.";
    document.getElementById("admin_done_jobs_full").innerHTML = html || "Keine erledigten Fahrten.";
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

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
    return escapeHtml(value);
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
startAdmin();
