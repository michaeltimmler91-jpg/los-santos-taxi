const SUPABASE_URL = "https://unkfqoplynwabulnzpar.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_AkIVrLBsgIV2jYJ5gGsBmw_f7P62KTK";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let companies = [];
let fixedCompanyName = null;

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

    if (!companyName || !code || !customerName || !destination) {
        resultBox.innerHTML = `
            <div class="admin-card">
                ❌ Bitte Code, Empfänger und Ziel eintragen.
            </div>
        `;
        return;
    }

    if (foodCost < 0) {
        resultBox.innerHTML = `
            <div class="admin-card">
                ❌ Essenskosten dürfen nicht negativ sein.
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

    const { error } = await client
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
        }]);

    if (error) {
        console.error(error);

        resultBox.innerHTML = `
            <div class="admin-card">
                ❌ Auftrag konnte nicht gesendet werden.
            </div>
        `;
        return;
    }

    resultBox.innerHTML = `
        <div class="admin-card">
            ✅ Auftrag wurde an das Taxi gesendet.
        </div>
    `;

    document.getElementById("company_code").value = "";
    document.getElementById("customer_name").value = "";
    document.getElementById("destination").value = "";
    document.getElementById("food_cost").value = "0";
    document.getElementById("notes").value = "";
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

loadCompanies();
