const SUPABASE_URL = "https://unkfqoplynwabulnzpar.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_AkIVrLBsgIV2jYJ5gGsBmw_f7P62KTK";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const WORKSHOP_CODE = "Benny2026";
const PAY_CODE = "ZAHLEN2026";

async function loadDrivers() {
    const select = document.getElementById("taxi_driver");

    const { data, error } = await client
        .from("taxi_users")
        .select("*")
        .order("display_name", { ascending: true });

    if (error) {
        console.error(error);
        select.innerHTML = `<option>Fehler beim Laden</option>`;
        return;
    }

    select.innerHTML = "";

    (data || []).forEach(user => {
        select.innerHTML += `
            <option value="${escapeAttr(user.display_name)}">
                ${escapeHtml(user.display_name)}
            </option>
        `;
    });
}

async function saveWorkshopCost() {
    const firmCode = document.getElementById("firm_code").value.trim();
    const taxiDriver = document.getElementById("taxi_driver").value;
    const mechanicName = document.getElementById("mechanic_name").value.trim();
    const workType = document.getElementById("work_type").value;
    const amount = Number(document.getElementById("amount").value || 0);
    const notes = document.getElementById("notes").value.trim();
    const resultBox = document.getElementById("workshop_result");

    resultBox.innerHTML = "";

    if (firmCode !== WORKSHOP_CODE) {
        resultBox.innerHTML = `
            <div class="admin-card">
                ❌ Firmencode ist falsch.
            </div>
        `;
        return;
    }

    if (!taxiDriver || !mechanicName || !workType || amount <= 0) {
        resultBox.innerHTML = `
            <div class="admin-card">
                ❌ Bitte Fahrer, Mechaniker, Art und Betrag eintragen.
            </div>
        `;
        return;
    }

    const { error } = await client
        .from("taxi_workshop_costs")
        .insert([{
            firm_code: firmCode,
            taxi_driver: taxiDriver,
            mechanic_name: mechanicName,
            work_type: workType,
            amount: amount,
            notes: notes,
            paid: false
        }]);

    if (error) {
        console.error(error);

        resultBox.innerHTML = `
            <div class="admin-card">
                ❌ Rechnung konnte nicht gespeichert werden.
            </div>
        `;
        return;
    }

    resultBox.innerHTML = `
        <div class="admin-card success-card">
            ✅ Rechnung wurde gespeichert.
        </div>
    `;

    document.getElementById("mechanic_name").value = "";
    document.getElementById("amount").value = "0";
    document.getElementById("notes").value = "";

    await loadWorkshopData();
}

async function loadWorkshopData() {
    await loadOpenWorkshopBills();
    await loadWorkshopArchive();
}

async function loadOpenWorkshopBills() {
    const box = document.getElementById("open_workshop_list");

    const { data, error } = await client
        .from("taxi_workshop_costs")
        .select("*")
        .eq("firm_code", WORKSHOP_CODE)
        .eq("paid", false)
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        box.innerHTML = "Fehler beim Laden.";
        return;
    }

    const bills = data || [];

    const total = bills.reduce((sum, bill) => {
        return sum + Number(bill.amount || 0);
    }, 0);

    document.getElementById("open_count").innerText = bills.length;
    document.getElementById("open_total").innerText = `${total}$`;

    if (bills.length === 0) {
        box.innerHTML = `
            <div class="admin-card">
                Keine offenen Werkstattrechnungen vorhanden.
            </div>
        `;
        return;
    }

    let html = `
        <div class="admin-card">
            <strong>Offene Gesamtrechnung</strong><br><br>
            <span style="font-size:42px;color:#facc15;font-weight:900;">
                ${total}$
            </span>
            <br><br>
            🔧 Offene Einträge: ${bills.length}
        </div>
    `;

    bills.forEach(bill => {
        const date = bill.created_at
            ? new Date(bill.created_at).toLocaleString("de-DE")
            : "-";

        html += `
            <div class="done-row">

                <div class="done-line-top">
                    <strong>${escapeHtml(bill.taxi_driver || "-")}</strong>
                    <span class="done-dot">•</span>
                    <span>${escapeHtml(bill.work_type || "-")}</span>
                    <span class="done-dot">•</span>
                    <span>👨‍🔧 ${escapeHtml(bill.mechanic_name || "-")}</span>
                </div>

                <div class="done-line-bottom">
                    <span>🕒 ${date}</span>
                    <span>💰 ${bill.amount || 0}$</span>
                    <span>📝 ${escapeHtml(bill.notes || "-")}</span>
                </div>

            </div>
        `;
    });

    box.innerHTML = html;
}

async function loadWorkshopArchive() {
    const box = document.getElementById("archive_workshop_list");

    const { data, error } = await client
        .from("taxi_workshop_costs")
        .select("*")
        .eq("firm_code", WORKSHOP_CODE)
        .eq("paid", true)
        .order("paid_at", { ascending: false })
        .limit(50);

    if (error) {
        console.error(error);
        box.innerHTML = "Fehler beim Laden.";
        return;
    }

    const bills = data || [];

    document.getElementById("archive_count").innerText = bills.length;

    if (bills.length === 0) {
        box.innerHTML = `
            <div class="admin-card">
                Noch keine bezahlten Werkstattrechnungen vorhanden.
            </div>
        `;
        return;
    }

    let html = "";

    bills.forEach(bill => {
        const date = bill.created_at
            ? new Date(bill.created_at).toLocaleString("de-DE")
            : "-";

        const paidDate = bill.paid_at
            ? new Date(bill.paid_at).toLocaleString("de-DE")
            : "-";

        html += `
            <div class="done-row">

                <div class="done-line-top">
                    <strong>${escapeHtml(bill.taxi_driver || "-")}</strong>
                    <span class="done-dot">•</span>
                    <span>${escapeHtml(bill.work_type || "-")}</span>
                    <span class="done-dot">•</span>
                    <span>✅ Bezahlt</span>
                </div>

                <div class="done-line-bottom">
                    <span>🕒 ${date}</span>
                    <span>💰 ${bill.amount || 0}$</span>
                    <span>👨‍🔧 ${escapeHtml(bill.mechanic_name || "-")}</span>
                    <span title="Bezahlt am: ${paidDate}">📦 Archiv</span>
                </div>

            </div>
        `;
    });

    box.innerHTML = html;
}

async function payWorkshopBills() {
    const payCode = document.getElementById("pay_code").value.trim();

    if (payCode !== PAY_CODE) {
        alert("Zahlungs-Code ist falsch.");
        return;
    }

    const ok = confirm(
        "Alle offenen Werkstattrechnungen wirklich als bezahlt markieren?"
    );

    if (!ok) return;

    const { error } = await client
        .from("taxi_workshop_costs")
        .update({
            paid: true,
            paid_at: new Date().toISOString()
        })
        .eq("firm_code", WORKSHOP_CODE)
        .eq("paid", false);

    if (error) {
        console.error(error);
        alert("Wochenabrechnung konnte nicht abgeschlossen werden.");
        return;
    }

    alert("Wochenabrechnung abgeschlossen.");

    document.getElementById("pay_code").value = "";

    await loadWorkshopData();
}

function toggleArchive() {
    const box = document.getElementById("archive_workshop_list");
    const arrow = document.getElementById("archive_arrow");

    if (!box || !arrow) return;

    if (box.style.display === "none") {
        box.style.display = "block";
        arrow.innerText = "▼";
    } else {
        box.style.display = "none";
        arrow.innerText = "▶";
    }
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

async function startWorkshopPage() {
    await loadDrivers();
    await loadWorkshopData();
}

startWorkshopPage();
