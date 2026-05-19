let currentUser = null;
let currentAdminTab = "tab_dashboard";

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

    setupAdminNavigation();

    await loadAdminStats();
    await loadUsers();
    await loadCompanies();
    await loadTipsStats();
    await loadDealerStats();
    await loadAnnouncements();
    await loadAdminDoneJobs();
    await loadAdminTimeStats();
    await loadDriverProfiles();

    if (typeof loadPlzReports === "function") {
        await loadPlzReports();
    }

    loadDashboardOverview();
    loadAdminStatusUsers();

    showAdminTab("tab_dashboard");
}

function logoutAdmin() {

    localStorage.removeItem("taxiUser");

    location.href = "index.html";
}

function setupAdminNavigation() {

    document
    .querySelectorAll(".admin-nav-btn")
    .forEach(btn => {

        btn.addEventListener("click", () => {

            const tabId =
            btn.dataset.tab;

            if (!tabId) return;

            showAdminTab(tabId);
        });
    });
}

function showAdminTab(tabId) {

    currentAdminTab = tabId;

    document
    .querySelectorAll(".admin-tab-content")
    .forEach(tab => {

        tab.style.display = "none";
    });

    document
    .querySelectorAll(".admin-nav-btn")
    .forEach(btn => {

        btn.classList.remove("active");
    });

    const activeTab =
    document.getElementById(tabId);

    if (activeTab) {
        activeTab.style.display = "block";
    }

    const activeButton =
    document.querySelector(
        `.admin-nav-btn[data-tab="${tabId}"]`
    );

    if (activeButton) {
        activeButton.classList.add("active");
    }
}

async function loadAdminStats() {

    const users = await getTaxiUsers();
    const companies = await getTaxiCompanies();
    const jobs = await getTaxiJobs();

    const drivers =
    users.filter(user =>
        user.role === "fahrer"
    ).length;

    const companyCount =
    companies.length;

    const openJobs =
    jobs.filter(job =>
        job.job_status === "Offen"
    ).length;

    const openTips =
    jobs
    .filter(job =>
        job.job_status === "Erledigt" &&
        job.tip_paid !== true
    )
    .reduce((sum, job) => {

        return sum +
        Number(job.tip_amount || 0);

    }, 0);

    setText(
        "adminStatDrivers",
        drivers
    );

    setText(
        "adminStatCompanies",
        companyCount
    );

    setText(
        "adminStatOpenJobs",
        openJobs
    );

    setText(
        "adminStatTips",
        `${openTips}$`
    );
}

function loadDashboardOverview() {

    const box =
    document.getElementById(
        "dashboard_overview"
    );

    if (!box) return;

    box.innerHTML = `

        <div class="admin-card">

            <strong>
                📊 Adminübersicht
            </strong>

            <br><br>

            Willkommen im neuen Taxi Adminbereich.

            <br><br>

            Bereiche wurden jetzt gruppiert:

            <ul>
                <li>🚕 Taxi</li>
                <li>👥 Benutzer</li>
                <li>🏢 Firmen</li>
                <li>🗺️ PLZ-System</li>
                <li>🎉 EasterEggs</li>
            </ul>

        </div>
    `;
}

function setText(id, value) {

    const el =
    document.getElementById(id);

    if (!el) return;

    el.innerText = value;
}

function toggleAdminNavGroup(button) {

    const group =
    button.parentElement;

    if (!group) return;

    group.classList.toggle("collapsed");
}

function openPlzAdminTab() {

    showAdminTab("tab_plz_admin");

    if (
        typeof loadPlzReports === "function"
    ) {
        loadPlzReports();
    }
}

function openEasterEggTab() {

    showAdminTab("tab_eastereggs");
}

function runEgg(type) {

    if (
        typeof triggerGlobalEasterEgg !== "function"
    ) {

        alert(
            "EasterEgg-System nicht geladen."
        );

        return;
    }

    triggerGlobalEasterEgg(type);
}

function escapeHtml(text) {

    if (!text) return "";

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeAttr(text) {
    return escapeHtml(text);
}

window.addEventListener(
    "DOMContentLoaded",
    startAdmin
);
```

# Wichtige Einbindung

Zusätzlich unten in deiner `admin.html`:

```html
<script src="plz_admin.js?v=2"></script>
<script src="eastereggs.js?v=2"></script>
<script src="admin.js?v=99"></script>
```

Und bei jedem Menübutton:

```html
<button
    class="admin-nav-btn"
    data-tab="tab_plz_admin"
>
    🗺️ PLZ Admin
</button>

