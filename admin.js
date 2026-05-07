const SUPABASE_URL = "https://unkfqoplynwabulnzpar.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_AkIVrLBsgIV2jYJ5gGsBmw_f7P62KTK";

const client = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

let currentUser = null;

async function startAdmin() {

    const savedUser =
        localStorage.getItem("taxiUser");

    if (!savedUser) {
        location.href = "index.html";
        return;
    }

    currentUser = JSON.parse(savedUser);

    if (currentUser.role !== "admin") {

        document.getElementById(
            "adminAccessDenied"
        ).style.display = "block";

        return;
    }

    document.getElementById(
        "adminApp"
    ).style.display = "block";

    document.getElementById(
        "adminUserName"
    ).innerText = currentUser.display_name;

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

    document.querySelectorAll(".admin-tab-content")
        .forEach(tab => {
            tab.style.display = "none";
        });

    document.querySelectorAll(".admin-tab-btn")
        .forEach(btn => {
            btn.classList.remove("active");
        });

    document.getElementById(tabId)
        .style.display = "block";

    event.target.classList.add("active");
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

    const drivers =
        (users || []).filter(
            user => user.role === "fahrer"
        ).length;

    const companyCount =
        (companies || []).length;

    const openJobs =
        (jobs || []).filter(
            job => job.job_status === "Offen"
        ).length;

    const totalTips =
        (jobs || [])
        .filter(job =>
            job.job_status === "Erledigt"
        )
        .reduce((sum, job) =>
            sum + Number(job.tip_amount || 0), 0);

    document.getElementById(
        "adminStatDrivers"
    ).innerText = drivers;

    document.getElementById(
        "adminStatCompanies"
    ).innerText = companyCount;

    document.getElementById(
        "adminStatOpenJobs"
    ).innerText = openJobs;

    document.getElementById(
        "adminStatTips"
    ).innerText = `${totalTips}$`;
}

function loadDashboardOverview() {

    const box =
        document.getElementById(
            "dashboard_overview"
        );

    box.innerHTML = `
        <div class="admin-card">
            <strong>📊 Adminübersicht</strong><br><br>

            Willkommen im modernen Taxi-Adminbereich 😄<br><br>

            Hier kannst du:
            <br>
            • Fahrer verwalten
            <br>
            • Firmen verwalten
            <br>
            • Fahrten bearbeiten
            <br>
            • Trinkgeld auswerten
            <br>
            • Aufträge kontrollieren
        </div>
    `;
}

async function createUser() {

    const username =
        document.getElementById(
            "new_username"
        ).value.trim();

    const display_name =
        document.getElementById(
            "new_display_name"
        ).value.trim();

    const password =
        document.getElementById(
            "new_password"
        ).value.trim();

    const role =
        document.getElementById(
            "new_role"
        ).value;

    if (
        !username ||
        !display_name ||
        !password
    ) {
        alert("Bitte alles ausfüllen.");
        return;
    }

    const { error } = await client
        .from("taxi_users")
        .insert([{
            username,
            display_name,
            password,
            role
        }]);

    if (error) {
        alert("Benutzer konnte nicht erstellt werden.");
        console.error(error);
        return;
    }

    alert("Benutzer erstellt.");

    loadUsers();

    loadAdminStats();
}

async function loadUsers() {

    const box =
        document.getElementById(
            "users_list"
        );

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

                <strong>
                    ${escapeHtml(user.display_name)}
                </strong><br>

                Benutzername:
                ${escapeHtml(user.username)}
                <br>

                Rolle:
                ${escapeHtml(user.role)}

                <div class="admin-actions">

                    <button
                        class="small-btn"
                        onclick="changeRole(
                            '${user.id}',
                            '${user.role}'
                        )"
                    >
                        Rolle ändern
                    </button>

                    <button
                        class="small-btn"
                        onclick="changePassword(
                            '${user.id}'
                        )"
                    >
                        Passwort ändern
                    </button>

                    <button
                        class="small-btn danger-btn"
                        onclick="deleteUser(
                            '${user.id}'
                        )"
                    >
                        Löschen
                    </button>

                </div>

            </div>
        `;
    });
}

async function changeRole(id, currentRole) {

    const newRole =
        currentRole === "admin"
        ? "fahrer"
        : "admin";

    const { error } = await client
        .from("taxi_users")
        .update({
            role: newRole
        })
        .eq("id", id);

    if (error) {
        alert("Rolle konnte nicht geändert werden.");
        return;
    }

    loadUsers();

    loadAdminStats();
}

async function changePassword(id) {

    const newPassword =
        prompt("Neues Passwort:");

    if (!newPassword) return;

    const { error } = await client
        .from("taxi_users")
        .update({
            password: newPassword
        })
        .eq("id", id);

    if (error) {
        alert("Passwort konnte nicht geändert werden.");
        return;
    }

    alert("Passwort geändert.");
}

async function deleteUser(id) {

    const ok =
        confirm("Benutzer wirklich löschen?");

    if (!ok) return;

    const { error } = await client
        .from("taxi_users")
        .delete()
        .eq("id", id);

    if (error) {
        alert("Benutzer konnte nicht gelöscht werden.");
        return;
    }

    loadUsers();

    loadAdminStats();
}

async function createCompany() {

    const company_name =
        document.getElementById(
            "new_company_name"
        ).value.trim();

    if (!company_name) {
        alert("Bitte Firmenname eingeben.");
        return;
    }

    const { error } = await client
        .from("taxi_companies")
        .insert([{
            company_name,
            active: true
        }]);

    if (error) {
        alert("Firma konnte nicht erstellt werden.");
        return;
    }

    document.getElementById(
        "new_company_name"
    ).value = "";

    loadCompanies();

    loadAdminStats();
}

async function loadCompanies() {

    const box =
        document.getElementById(
            "companies_list"
        );

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

        box.innerHTML += `
            <div class="admin-card">

                <strong>
                    ${escapeHtml(company.company_name)}
                </strong>

                <div class="admin-actions">

                    <button
                        class="small-btn danger-btn"
                        onclick="deleteCompany(
                            '${company.id}'
                        )"
                    >
                        Löschen
                    </button>

                </div>

            </div>
        `;
    });
}

async function deleteCompany(id) {

    const ok =
        confirm("Firma wirklich löschen?");

    if (!ok) return;

    const { error } = await client
        .from("taxi_companies")
        .delete()
        .eq("id", id);

    if (error) {
        alert("Firma konnte nicht gelöscht werden.");
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

        const driver =
            job.assigned_driver || "Unbekannt";

        if (!grouped[driver]) {

            grouped[driver] = {
                rides: 0,
                tips: 0,
                fares: 0,
                invoices: 0,
                food: 0
            };
        }

        grouped[driver].rides++;

        grouped[driver].tips +=
            Number(job.tip_amount || 0);

        grouped[driver].fares +=
            Number(job.fare_amount || 0);

        grouped[driver].invoices +=
            Number(job.invoice_amount || 0);

        grouped[driver].food +=
            Number(job.food_cost || 0);
    });

    const html = Object.entries(grouped)
        .map(([driver, stats]) => `
            <div class="admin-card">

                <strong>${escapeHtml(driver)}</strong>

                <br><br>

                🚕 Fahrten:
                ${stats.rides}
                <br>

                🎁 Trinkgeld:
                ${stats.tips}$
                <br>

                💰 Fahrtkosten:
                ${stats.fares}$
                <br>

                🧾 Rechnungen:
                ${stats.invoices}$
                <br>

                🍔 Essenskosten:
                ${stats.food}$

            </div>
        `).join("");

    document.getElementById(
        "tips_stats"
    ).innerHTML = html;

    document.getElementById(
        "tips_stats_full"
    ).innerHTML = html;
}

async function loadAdminDoneJobs() {

    const { data, error } = await client
        .from("taxi_jobs")
        .select("*")
        .eq("job_status", "Erledigt")
        .order("completed_at", {
            ascending: false
        })
        .limit(50);

    if (error) {
        console.error(error);
        return;
    }

    const html = data.map(job => `
        <div class="admin-card">

            <strong>
                ${escapeHtml(job.assigned_driver || "-")}
            </strong>

            <br><br>

            🚕 ${escapeHtml(job.ride_type || "-")}
            <br>

            👤 ${escapeHtml(job.customer_name || "-")}
            <br>

            📍 ${escapeHtml(job.pickup_location || "-")}
            →
            ${escapeHtml(job.destination || "-")}
            <br>

            💰 Rechnung:
            ${job.invoice_amount || 0}$
            <br>

            🎁 Trinkgeld:
            ${job.tip_amount || 0}$

            <div class="admin-actions">

                <button
                    class="small-btn danger-btn"
                    onclick="deleteJob(
                        '${job.id}'
                    )"
                >
                    Löschen
                </button>

            </div>

        </div>
    `).join("");

    document.getElementById(
        "admin_done_jobs"
    ).innerHTML = html;

    document.getElementById(
        "admin_done_jobs_full"
    ).innerHTML = html;
}

async function deleteJob(id) {

    const ok =
        confirm("Fahrt wirklich löschen?");

    if (!ok) return;

    const { error } = await client
        .from("taxi_jobs")
        .delete()
        .eq("id", id);

    if (error) {
        alert("Fahrt konnte nicht gelöscht werden.");
        return;
    }

    loadAdminDoneJobs();

    loadAdminStats();

    loadTipsStats();
}

function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

startAdmin();
