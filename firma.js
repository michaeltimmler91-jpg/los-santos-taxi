const SUPABASE_URL = "https://unkfqoplynwabulnzpar.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_AkIVrLBsgIV2jYJ5gGsBmw_f7P62KTK";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let companies = [];
let fixedCompanyName = null;
let currentJobId = null;
let liveChannel = null;

function getCompanyFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("firma");
}

async function loadCompanies() {
    const select = document.getElementById("company_name");

    fixedCompanyName = getCompanyFromUrl();

    const { data, error } = await client
        .from("taxi_companies")
        .select("*")
        .eq("active", true)
        .order("company_name", { ascending: true });

    if (error) {
        console.error(error);
        select.innerHTML = `<option>Fehler beim Laden</option>`;
        return;
    }

    companies = data || [];

    if (fixedCompanyName) {
        const fixedCompany = companies.find(
            company => company.company_name.toLowerCase() === fixedCompanyName.toLowerCase()
        );

        if (fixedCompany) {
            document.getElementById("company_select_field").style.display = "none";
            document.getElementById("fixed_company_box").style.display = "block";
            document.getElementById("fixed_company_name").innerText = fixedCompany.company_name;

            select.innerHTML = `
                <option value="${escapeAttr(fixedCompany.company_name)}">
                    ${escapeHtml(fixedCompany.company_name)}
                </option>
            `;

            return;
        }

        document.getElementById("fixed_company_box").style.display = "block";
        document.getElementById("fixed_company_name").innerText = "Firma nicht gefunden";
    }

    select.innerHTML = "";

    companies.forEach(company => {
        select.innerHTML += `
            <option value="${escapeAttr(company.company_name)}">
                ${escapeHtml(company.company_name)}
            </option>
        `;
    });
}

async function sendCompanyJob() {
    const companyName = document.getElementById("company_name").value;
    const code = document.getElementById("company_code").value.trim();
    const customerName = document.getElementById("customer_name").value.trim();
    const destination = document.getElementById("destination").value.trim();
    const foodCost = Number(document.getElementById("food_cost").value || 0);
    const notes = document.getElementById("notes").value.trim();
    const resultBox = document.getElementById("company_result");

    resultBox.innerHTML = "";

    if (
        !companyName ||
        !code ||
        !customerName ||
        !destination ||
        foodCost <= 0
    ) {
        resultBox.innerHTML = `
            <div class="admin-card">
                ❌ Bitte Code, Empfänger, Ziel und Essenskosten eintragen.
            </div>
        `;
        return;
    }

    const selectedCompany = companies.find(
        company => company.company_name === companyName
    );

    if (!selectedCompany) {
        resultBox.innerHTML = `
            <div class="admin-card">
                ❌ Unternehmen wurde nicht gefunden.
            </div>
        `;
        return;
    }

    if (!selectedCompany.company_code || selectedCompany.company_code !== code) {
        resultBox.innerHTML = `
            <div class="admin-card">
                ❌ Firmen-Code ist falsch.
            </div>
        `;
        return;
    }

    const { data, error } = await client
        .from("taxi_jobs")
        .insert([{
            created_by: companyName,
            job_status: "Offen",
            ride_type: "Essenslieferung",
            pickup_location: companyName,
            destination: destination,
            customer_name: customerName,
            company_name: companyName,
            food_cost: foodCost,
            food_paid_by: "firma",
            notes: notes
        }])
        .select()
        .single();

    if (error) {
        console.error(error);

        resultBox.innerHTML = `
            <div class="admin-card">
                ❌ Auftrag konnte nicht gesendet werden.
            </div>
        `;
        return;
    }

    currentJobId = data.id;

    startLiveTracking();
    updateLiveStatus(data);

    resultBox.innerHTML = `
    <div class="admin-card success-card">
        <div style="font-size:48px;margin-bottom:12px;">
            ✅
        </div>

        <strong style="font-size:24px;">
            Auftrag erfolgreich gesendet
        </strong>

        <br><br>

        Das Taxi wurde informiert.
    </div>
`;

document.getElementById("company_form_card")
    .scrollIntoView({
        behavior: "smooth"
    });

    document.getElementById("company_code").value = "";
    document.getElementById("customer_name").value = "";
    document.getElementById("destination").value = "";
    document.getElementById("food_cost").value = "0";
    document.getElementById("notes").value = "";
}

function updateLiveStatus(job) {
    const box = document.getElementById("live_job_status");

    if (!box) return;

    box.style.display = "block";

    let statusHtml = "";

    if (job.job_status === "Offen") {
        statusHtml = `
            <div class="status-badge status-pause">
                🟡 Auftrag offen
            </div>
        `;
    }

    if (job.job_status === "Übernommen") {
        statusHtml = `
            <div class="status-badge status-online">
                🚕 Fahrer unterwegs: ${escapeHtml(job.assigned_driver || "-")}
            </div>
        `;
    }

    if (job.job_status === "Erledigt") {
        statusHtml = `
            <div class="status-badge status-online">
                ✅ Lieferung abgeschlossen
            </div>
        `;
    }

    box.innerHTML = `
        <strong>Live-Status</strong>
        <br><br>
        ${statusHtml}
    `;
}

function startLiveTracking() {
    if (!currentJobId) return;

    if (liveChannel) {
        client.removeChannel(liveChannel);
    }

    liveChannel = client
        .channel(`firma-job-live-${currentJobId}`)
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "taxi_jobs"
            },
            payload => {
                if (!payload.new) return;

                if (payload.new.id === currentJobId) {
                    updateLiveStatus(payload.new);
                }
            }
        )
        .subscribe();
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
async function loadDriverCount() {
    const formCard = document.getElementById("company_form_card");
    const noDriverBox = document.getElementById("no_driver_box");

    if (!formCard || !noDriverBox) return;

    const { data, error } = await client
        .from("taxi_driver_status")
        .select("*")
        .eq("status", "Im Dienst");

    if (error) {
        console.error(error);
        return;
    }

    const count = data?.length || 0;

    if (count <= 0) {
        formCard.style.display = "none";
        noDriverBox.style.display = "block";
        return;
    }

    formCard.style.display = "block";
    noDriverBox.style.display = "none";
}
async function loadLastCompanyJobs() {

    const box = document.getElementById("company_last_jobs");

    if (!box) return;

    let companyName = fixedCompanyName;

    if (!companyName) {
        companyName = document.getElementById("company_name")?.value;
    }

    if (!companyName) {
        box.innerHTML = "Keine Firma gewählt.";
        return;
    }

    const { data, error } = await client
        .from("taxi_jobs")
        .select("*")
        .eq("company_name", companyName)
        .eq("ride_type", "Essenslieferung")
        .neq("job_status", "Gelöscht")
        .order("created_at", { ascending: false })
        .limit(5);

    if (error) {
        console.error(error);

        box.innerHTML = "Fehler beim Laden.";
        return;
    }

    if (!data || data.length === 0) {
        box.innerHTML = "Noch keine Aufträge vorhanden.";
        return;
    }

    box.innerHTML = data.map(job => {

        let badge = `
            <span class="status-badge status-pause">
                🟡 Offen
            </span>
        `;

        if (job.job_status === "Übernommen") {
            badge = `
                <span class="status-badge status-online">
                    🚕 ${escapeHtml(job.assigned_driver || "-")}
                </span>
            `;
        }

        if (job.job_status === "Erledigt") {
            badge = `
                <span class="status-badge status-online">
                    ✅ Geliefert
                </span>
            `;
        }
        if (job.job_status === "Nicht angetroffen") {
    badge = `
        <span class="status-badge status-offline">
            ❌ Nicht angetroffen
        </span>
    `;
}

        return `
            <div class="ride-card ride-card-modern">

                <div class="ride-top">
                    <span class="ride-type-badge">
                        🍔 Lieferung
                    </span>

                    ${badge}
                </div>

                <div class="ride-route">
                    <div>
                        <small>Empfänger</small>
                        <strong>${escapeHtml(job.customer_name || "-")}</strong>
                    </div>

                    <div class="ride-arrow">→</div>

                    <div>
                        <small>Ziel</small>
                        <strong>${escapeHtml(job.destination || "-")}</strong>
                    </div>
                </div>

                <div class="ride-info-grid">
                    <div>🍔 ${job.food_cost || 0}$</div>
                    <div>📝 ${escapeHtml(job.notes || "-")}</div>
                </div>

            </div>
        `;

    }).join("");
}

loadCompanies();
loadLastCompanyJobs();
loadDriverCount();

setInterval(loadDriverCount, 15000);

