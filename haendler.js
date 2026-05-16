const DEALER_CODE = "GWH2026";

async function loginDealer() {
    const code = document.getElementById("dealer_code").value.trim();
    const resultBox = document.getElementById("dealer_login_result");

    resultBox.innerHTML = "";

    if (code !== DEALER_CODE) {
        resultBox.innerHTML = `
            <div class="admin-card">
                ❌ Händler-Code ist falsch.
            </div>
        `;
        return;
    }

    localStorage.setItem("dealerAccess", "true");

    document.getElementById("dealer_login_card").style.display = "none";
    document.getElementById("dealer_app").style.display = "block";

    await loadDealerData();
}

async function loadDealerData() {
    await loadOpenDealerRides();
    await loadDealerArchive();
}

async function loadOpenDealerRides() {
    const list = document.getElementById("dealer_open_list");

    const { data, error } = await client
        .from("taxi_jobs")
        .select("*")
        .eq("ride_type", "Gebrauchtwagenhändler")
        .eq("job_status", "Erledigt")
        .neq("dealer_paid", true)
        .order("completed_at", { ascending: false });

    if (error) {
        console.error(error);
        list.innerHTML = `
            <div class="admin-card">
                Fehler beim Laden.
            </div>
        `;
        return;
    }

    const rides = data || [];

    const total = rides.reduce((sum, ride) => {
        return sum + Number(ride.invoice_amount || 0);
    }, 0);

    document.getElementById("dealer_open_count").innerText = rides.length;
    document.getElementById("dealer_open_total").innerText = `${total}$`;

    if (rides.length === 0) {
        list.innerHTML = `
            <div class="admin-card">
                Keine offenen Händlerfahrten vorhanden.
            </div>
        `;
        return;
    }

    let html = `
        <div class="admin-card">
            <strong>💰 Offene Monatssumme</strong><br><br>
            <span style="font-size:42px;color:#facc15;font-weight:900;">
                ${total}$
            </span>
            <br><br>
            🚗 Offene Fahrten: ${rides.length}
        </div>
    `;

    rides.forEach(ride => {
        html += `
            <div class="ride-card ride-card-modern">
                <div class="ride-top">
                    <span class="ride-type-badge">
                        🚗 Händlerfahrt
                    </span>

                    <span class="ride-status-badge">
                        Offen
                    </span>
                </div>

                <div class="ride-route">
                    <div>
                        <small>Kunde</small>
                        <strong>${escapeHtml(ride.customer_name || "-")}</strong>
                    </div>

                    <div class="ride-arrow">→</div>

                    <div>
                        <small>Ziel</small>
                        <strong>${escapeHtml(ride.destination || "-")}</strong>
                    </div>
                </div>

                <div class="ride-info-grid">
                    <div>🚕 Fahrer: ${escapeHtml(ride.assigned_driver || "-")}</div>
                    <div>📍 Start: ${escapeHtml(ride.pickup_location || "-")}</div>
                    <div>📏 KM: ${ride.kilometers || 0}</div>
                    <div>🧾 Rechnung: ${ride.invoice_amount || 0}$</div>
                    <div>📝 ${escapeHtml(ride.notes || "-")}</div>
                </div>
            </div>
        `;
    });

    list.innerHTML = html;
}

async function loadDealerArchive() {
    const list = document.getElementById("dealer_archive_list");

    const { data, error } = await client
        .from("taxi_jobs")
        .select("*")
        .eq("ride_type", "Gebrauchtwagenhändler")
        .eq("job_status", "Erledigt")
        .eq("dealer_paid", true)
        .order("dealer_paid_at", { ascending: false })
        .limit(50);

    if (error) {
        console.error(error);
        list.innerHTML = `
            <div class="admin-card">
                Fehler beim Laden.
            </div>
        `;
        return;
    }

    const rides = data || [];

    document.getElementById("dealer_archive_count").innerText = rides.length;

    if (rides.length === 0) {
        list.innerHTML = `
            <div class="admin-card">
                Noch keine bezahlten Händlerfahrten vorhanden.
            </div>
        `;
        return;
    }

    let html = "";

    rides.forEach(ride => {
        html += `
            <div class="compact-ride">
                <div>
                    <strong>${escapeHtml(ride.assigned_driver || "-")}</strong><br>
                    Händlerfahrt
                </div>

                <div>🚕 ${ride.kilometers || 0} KM</div>
                <div>🧾 ${ride.invoice_amount || 0}$</div>
                <div>✅ Bezahlt</div>

                <div>
                    👤 ${escapeHtml(ride.customer_name || "-")}<br>
                    📍 ${escapeHtml(ride.pickup_location || "-")} → ${escapeHtml(ride.destination || "-")}
                </div>
            </div>
        `;
    });

    list.innerHTML = html;
}

function toggleDealerArchive() {
    const box = document.getElementById("dealer_archive_list");
    const arrow = document.getElementById("dealer_archive_arrow");

    if (!box || !arrow) return;

    if (box.style.display === "none") {
        box.style.display = "block";
        arrow.innerText = "▼";
    } else {
        box.style.display = "none";
        arrow.innerText = "▶";
    }
}

function checkDealerSession() {
    const hasAccess = localStorage.getItem("dealerAccess") === "true";

    if (!hasAccess) return;

    document.getElementById("dealer_login_card").style.display = "none";
    document.getElementById("dealer_app").style.display = "block";

    loadDealerData();
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

checkDealerSession();
