const SUPABASE_URL = "https://unkfqoplynwabulnzpar.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_AkIVrLBsgIV2jYJ5gGsBmw_f7P62KTK";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

function startAdmin() {
    const savedUser = localStorage.getItem("taxiUser");

    if (!savedUser) {
        document.getElementById("adminAccessDenied").style.display = "block";
        return;
    }

    currentUser = JSON.parse(savedUser);

    if (currentUser.role !== "admin") {
        document.getElementById("adminAccessDenied").style.display = "block";
        return;
    }

    document.getElementById("adminApp").style.display = "block";
    document.getElementById("adminUserName").innerText = currentUser.display_name;

    loadTipStats();
    loadUsers();
    loadCompanies();
    loadAdminDoneJobs();
    loadAdminStats();
}

function logoutAdmin() {
    localStorage.removeItem("taxiUser");
    location.href = "index.html";
}

async function loadTipStats() {
    const box = document.getElementById("tips_stats");

    const { data, error } = await client
        .from("taxi_jobs")
        .select("assigned_driver, tip_amount, fare_amount, invoice_amount, food_cost")
        .eq("job_status", "Erledigt");

    if (error) {
        console.error(error);
        box.innerHTML = "Fehler beim Laden.";
        return;
    }

    const stats = {};

    data.forEach(job => {
        const driver = job.assigned_driver || "Unbekannt";

        if (!stats[driver]) {
            stats[driver] = {
                tips: 0,
                rides: 0,
                fare: 0,
                invoice: 0,
                food: 0
            };
        }

        stats[driver].tips += Number(job.tip_amount || 0);
        stats[driver].rides += 1;
        stats[driver].fare += Number(job.fare_amount || 0);
        stats[driver].invoice += Number(job.invoice_amount || 0);
        stats[driver].food += Number(job.food_cost || 0);
    });

    let html = "";

    Object.keys(stats).forEach(driver => {
        html += `
            <div class="ride-card">
                <strong>${escapeHtml(driver)}</strong><br>
                🚕 Fahrten: ${stats[driver].rides}<br>
                🎁 Trinkgeld: ${stats[driver].tips}$<br>
                💰 Fahrtkosten/interne Abrechnung: ${stats[driver].fare}$<br>
                🧾 Rechnungen: ${stats[driver].invoice}$<br>
                🍔 Essenskosten: ${stats[driver].food}$
            </div>
        `;
    });

    box.innerHTML = html || "Noch keine erledigten Fahrten.";
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
        .insert([{ username, display_name, password, role, active: true }]);

    if (error) {
        alert("Benutzer konnte nicht erstellt werden.");
        console.error(error);
        return;
    }

    document.getElementById("new_username").value = "";
    document.getElementById("new_display_name").value = "";
    document.getElementById("new_password").value = "";

    loadUsers();
}

async function loadUsers() {
    const box = document.getElementById("users_list");

    const { data, error } = await client
        .from("taxi_users")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    box.innerHTML = "";

    data.forEach(user => {
        box.innerHTML += `
            <div class="ride-card">
                <strong>${escapeHtml(user.display_name)}</strong><br>
                Benutzer: ${escapeHtml(user.username)}<br>
                Rolle: ${escapeHtml(user.role)}<br>
                Aktiv: ${user.active ? "Ja" : "Nein"}

                <br><br>

                <button class="small-btn" onclick="toggleUserEdit('${user.id}')">
                    Bearbeiten
                </button>

                <button class="small-btn danger-btn" onclick="deleteUser('${user.id}', '${escapeAttr(user.display_name)}')">
                    Löschen
                </button>

                <div id="user_edit_${user.id}" style="display:none; margin-top:15px;">
                    <div class="form-grid">
                        <div class="field">
                            <label>Benutzername</label>
                            <input type="text" id="edit_username_${user.id}" value="${escapeAttr(user.username)}">
                        </div>

                        <div class="field">
                            <label>Anzeigename</label>
                            <input type="text" id="edit_display_${user.id}" value="${escapeAttr(user.display_name)}">
                        </div>

                        <div class="field">
                            <label>Passwort</label>
                            <input type="text" id="edit_password_${user.id}" value="${escapeAttr(user.password)}">
                        </div>

                        <div class="field">
                            <label>Rolle</label>
                            <select id="edit_role_${user.id}">
                                <option value="fahrer" ${user.role === "fahrer" ? "selected" : ""}>Fahrer</option>
                                <option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option>
                            </select>
                        </div>

                        <div class="field">
                            <label>Aktiv</label>
                            <select id="edit_active_${user.id}">
                                <option value="true" ${user.active ? "selected" : ""}>Ja</option>
                                <option value="false" ${!user.active ? "selected" : ""}>Nein</option>
                            </select>
                        </div>
                    </div>

                    <button onclick="saveUserEdit('${user.id}')">
                        Änderungen speichern
                    </button>
                </div>
            </div>
        `;
    });
}

function toggleUserEdit(userId) {
    const box = document.getElementById(`user_edit_${userId}`);
    if (!box) return;

    box.style.display = box.style.display === "none" ? "block" : "none";
}

async function saveUserEdit(userId) {
    const username = document.getElementById(`edit_username_${userId}`).value.trim();
    const displayName = document.getElementById(`edit_display_${userId}`).value.trim();
    const password = document.getElementById(`edit_password_${userId}`).value.trim();
    const role = document.getElementById(`edit_role_${userId}`).value;
    const active = document.getElementById(`edit_active_${userId}`).value === "true";

    if (!username || !displayName || !password) {
        alert("Benutzername, Anzeigename und Passwort dürfen nicht leer sein.");
        return;
    }

    const { error } = await client
        .from("taxi_users")
        .update({
            username,
            display_name: displayName,
            password,
            role,
            active
        })
        .eq("id", userId);

    if (error) {
        alert("Benutzer konnte nicht gespeichert werden.");
        console.error(error);
        return;
    }

    alert("Benutzer gespeichert.");
    loadUsers();
}

async function deleteUser(userId, displayName) {
    const ok = confirm(`Benutzer "${displayName}" wirklich komplett löschen?`);

    if (!ok) return;

    const { error } = await client
        .from("taxi_users")
        .delete()
        .eq("id", userId);

    if (error) {
        alert("Benutzer konnte nicht gelöscht werden.");
        console.error(error);
        return;
    }

    alert("Benutzer gelöscht.");
    loadUsers();
}

async function createCompany() {
    const company_name = document.getElementById("new_company_name").value.trim();

    if (!company_name) {
        alert("Bitte Unternehmen eintragen.");
        return;
    }

    const { error } = await client
        .from("taxi_companies")
        .insert([{ company_name, active: true }]);

    if (error) {
        alert("Unternehmen konnte nicht erstellt werden.");
        console.error(error);
        return;
    }

    document.getElementById("new_company_name").value = "";
    loadCompanies();
}

async function loadCompanies() {
    const box = document.getElementById("companies_list");

    const { data, error } = await client
        .from("taxi_companies")
        .select("*")
        .order("company_name", { ascending: true });

    if (error) {
        console.error(error);
        return;
    }

    box.innerHTML = "";

    data.forEach(company => {
        box.innerHTML += `
            <div class="ride-card">
                <strong>${escapeHtml(company.company_name)}</strong><br>
                Aktiv: ${company.active ? "Ja" : "Nein"}

                <br><br>

                <button class="small-btn" onclick="toggleCompanyActive('${company.id}', ${company.active})">
                    ${company.active ? "Deaktivieren" : "Aktivieren"}
                </button>
            </div>
        `;
    });
}

async function toggleCompanyActive(companyId, isActive) {
    const { error } = await client
        .from("taxi_companies")
        .update({ active: !isActive })
        .eq("id", companyId);

    if (error) {
        alert("Unternehmen konnte nicht geändert werden.");
        console.error(error);
        return;
    }

    loadCompanies();
}

async function loadAdminDoneJobs() {
    const box = document.getElementById("admin_done_jobs");

    const { data, error } = await client
        .from("taxi_jobs")
        .select("*")
        .eq("job_status", "Erledigt")
        .order("completed_at", { ascending: false })
        .limit(50);

    if (error) {
        console.error(error);
        return;
    }

    box.innerHTML = "";

    data.forEach(job => {
        box.innerHTML += `
            <div class="ride-card">
                <strong>${escapeHtml(job.assigned_driver || "-")}</strong> (${escapeHtml(job.ride_type || "-")})<br>
                👤 Kunde/Empfänger: ${escapeHtml(job.customer_name || "-")}<br>
                📍 ${escapeHtml(job.pickup_location || "-")} → ${escapeHtml(job.destination || "-")}<br>
                🚕 ${job.kilometers || 0} KM<br>
                💰 Fahrtkosten/interne Abrechnung: ${job.fare_amount || 0}$<br>
                🧾 Rechnung: ${job.invoice_amount || 0}$<br>
                🎁 Trinkgeld: ${job.tip_amount || 0}$<br>
                🍔 Essenskosten: ${job.food_cost || 0}$

                <br><br>

                <button class="small-btn" onclick="toggleJobEdit('${job.id}')">Bearbeiten</button>
                <button class="small-btn danger-btn" onclick="deleteDoneJob('${job.id}')">Löschen</button>

                <div id="job_edit_${job.id}" style="display:none; margin-top:15px;">
                    <div class="form-grid">
                        <div class="field">
                            <label>Kunde / Empfänger</label>
                            <input type="text" id="edit_customer_${job.id}" value="${escapeAttr(job.customer_name || "")}">
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
                            <label>Bemerkung</label>
                            <input type="text" id="edit_notes_${job.id}" value="${escapeAttr(job.notes || "")}">
                        </div>
                    </div>

                    <button onclick="saveJobEdit('${job.id}', '${job.ride_type}')">
                        Änderungen speichern
                    </button>
                </div>
            </div>
        `;
    });
}

function toggleJobEdit(jobId) {
    const box = document.getElementById(`job_edit_${jobId}`);
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

    return { fare, tip, billedTo };
}

async function saveJobEdit(jobId, rideType) {
    const customer = document.getElementById(`edit_customer_${jobId}`).value.trim();
    const destination = document.getElementById(`edit_destination_${jobId}`).value.trim();
    const km = Number(document.getElementById(`edit_km_${jobId}`).value);
    const invoice = Number(document.getElementById(`edit_invoice_${jobId}`).value);
    const food = Number(document.getElementById(`edit_food_${jobId}`).value);
    const notes = document.getElementById(`edit_notes_${jobId}`).value.trim();

    if (!destination) {
        alert("Bitte Ziel eintragen.");
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
            destination,
            kilometers: km,
            fare_amount: result.fare,
            invoice_amount: invoice,
            tip_amount: result.tip,
            food_cost: food,
            billed_to: result.billedTo,
            notes
        })
        .eq("id", jobId);

    if (error) {
        alert("Fahrt konnte nicht gespeichert werden.");
        console.error(error);
        return;
    }

    alert("Fahrt gespeichert.");
    loadAdminDoneJobs();
    loadTipStats();
}

async function deleteDoneJob(jobId) {
    const ok = confirm("Fahrt wirklich löschen? Sie wird nur ausgeblendet und nicht endgültig entfernt.");

    if (!ok) return;

    const { error } = await client
        .from("taxi_jobs")
        .update({ job_status: "Gelöscht" })
        .eq("id", jobId);

    if (error) {
        alert("Fahrt konnte nicht gelöscht werden.");
        console.error(error);
        return;
    }

    alert("Fahrt gelöscht.");
    loadAdminDoneJobs();
    loadTipStats();
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
async function loadAdminStats() {
    const { data: users } = await client
        .from("taxi_users")
        .select("*");

    const { data: companies } = await client
        .from("taxi_companies")
        .select("*");

    const { data: jobs } = await client
        .from("taxi_jobs")
        .select("*");

    const drivers = (users || []).filter(user => user.role === "fahrer").length;
    const companyCount = (companies || []).length;
    const openJobs = (jobs || []).filter(job => job.job_status === "Offen").length;

    const totalTips = (jobs || [])
        .filter(job => job.job_status === "Erledigt")
        .reduce((sum, job) => sum + Number(job.tip_amount || 0), 0);

    document.getElementById("adminStatDrivers").innerText = drivers;
    document.getElementById("adminStatCompanies").innerText = companyCount;
    document.getElementById("adminStatOpenJobs").innerText = openJobs;
    document.getElementById("adminStatTips").innerText = `${totalTips}$`;
}
function showAdminTab(tabId) {

    document.querySelectorAll(".admin-tab-content")
        .forEach(tab => {
            tab.style.display = "none";
        });

    document.querySelectorAll(".admin-tab-btn")
        .forEach(btn => {
            btn.classList.remove("active");
        });

    const target = document.getElementById(tabId);

    if (target) {
        target.style.display = "block";
    }

    event.target.classList.add("active");
}
startAdmin();
