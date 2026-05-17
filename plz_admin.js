const supabaseClient =
supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

let plzReportsCache = [];

document.addEventListener("DOMContentLoaded", () => {
    loadPlzReports();
});

async function loadPlzReports() {

    const list =
    document.getElementById("plz_reports_list");

    list.innerHTML = "L&auml;dt...";

    const { data, error } =
    await supabaseClient
    .from("plz_reports")
    .select("*")
    .order("created_at", {
        ascending: false
    });

    if (error) {

        console.error(error);

        list.innerHTML = `
            <div class="admin-card">
                ❌ Meldungen konnten nicht geladen werden.
            </div>
        `;

        return;
    }

    plzReportsCache = data || [];

    renderPlzReports();
}

function renderPlzReports() {

    const list =
    document.getElementById("plz_reports_list");

    const search =
    document
    .getElementById("plz_admin_search")
    .value
    .trim()
    .toLowerCase();

    const statusFilter =
    document
    .getElementById("plz_admin_status_filter")
    .value;

    let filtered =
    plzReportsCache.filter(report => {

        const matchesSearch =
        !search ||
        String(report.plz || "")
        .toLowerCase()
        .includes(search);

        const matchesStatus =
        statusFilter === "alle" ||
        (report.status || "offen") === statusFilter;

        return matchesSearch && matchesStatus;
    });

    if (filtered.length === 0) {

        list.innerHTML = `
            <div class="admin-card">
                Keine passenden Meldungen gefunden.
            </div>
        `;

        return;
    }

    list.innerHTML =
    filtered.map(report => {

        const status =
        report.status || "offen";

        const created =
        report.created_at
        ? new Date(report.created_at).toLocaleString("de-DE")
        : "-";

        return `
            <div class="admin-card plz-report-card">

                <div class="plz-report-top">
                    <div>
                        <strong>PLZ ${escapeHtml(report.plz || "-")}</strong><br>
                        <span>${escapeHtml(report.type || "-")}</span>
                    </div>

                    <div class="plz-status-badge status-${status}">
                        ${statusLabel(status)}
                    </div>
                </div>

                <div class="plz-report-meta">
                    📅 ${created}
                    ${report.reporter ? " • 👤 " + escapeHtml(report.reporter) : ""}
                </div>

                <div class="plz-report-text">
                    ${escapeHtml(report.text || "Keine Beschreibung angegeben.")}
                </div>

                <div class="form-grid" style="margin-top:16px;">

                    <div class="field">
                        <label>Status</label>
                        <select onchange="updatePlzReportStatus(${report.id}, this.value)">
                            <option value="offen" ${status === "offen" ? "selected" : ""}>Offen</option>
                            <option value="bearbeitung" ${status === "bearbeitung" ? "selected" : ""}>In Bearbeitung</option>
                            <option value="erledigt" ${status === "erledigt" ? "selected" : ""}>Erledigt</option>
                        </select>
                    </div>

                    <div class="field">
                        <label>Admin-Notiz</label>
                        <input
                            type="text"
                            id="note_${report.id}"
                            value="${escapeAttr(report.admin_note || "")}"
                            placeholder="z.B. erledigt / Wert angepasst"
                        >
                    </div>

                </div>

                <div class="admin-actions">
                    <button class="small-btn" onclick="savePlzReportNote(${report.id})">
                        💾 Notiz speichern
                    </button>

                    <button class="small-btn danger-btn" onclick="deletePlzReport(${report.id})">
                        🗑️ L&ouml;schen
                    </button>
                </div>

            </div>
        `;
    }).join("");
}

async function updatePlzReportStatus(id, status) {

    const { error } =
    await supabaseClient
    .from("plz_reports")
    .update({
        status: status
    })
    .eq("id", id);

    if (error) {
        console.error(error);
        alert("Status konnte nicht gespeichert werden.");
        return;
    }

    const report =
    plzReportsCache.find(item => item.id === id);

    if (report) {
        report.status = status;
    }

    renderPlzReports();
}

async function savePlzReportNote(id) {

    const note =
    document
    .getElementById(`note_${id}`)
    .value
    .trim();

    const { error } =
    await supabaseClient
    .from("plz_reports")
    .update({
        admin_note: note
    })
    .eq("id", id);

    if (error) {
        console.error(error);
        alert("Notiz konnte nicht gespeichert werden.");
        return;
    }

    const report =
    plzReportsCache.find(item => item.id === id);

    if (report) {
        report.admin_note = note;
    }

    alert("Notiz gespeichert.");
}

async function deletePlzReport(id) {

    const ok =
    confirm("Diese Meldung wirklich l&ouml;schen?");

    if (!ok) {
        return;
    }

    const { error } =
    await supabaseClient
    .from("plz_reports")
    .delete()
    .eq("id", id);

    if (error) {
        console.error(error);
        alert("Meldung konnte nicht gel&ouml;scht werden.");
        return;
    }

    plzReportsCache =
    plzReportsCache.filter(item => item.id !== id);

    renderPlzReports();
}

function statusLabel(status) {

    if (status === "bearbeitung") {
        return "In Bearbeitung";
    }

    if (status === "erledigt") {
        return "Erledigt";
    }

    return "Offen";
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
