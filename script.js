const SUPABASE_URL = "https://unkfqoplynwabulnzpar.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_AkIVrLBsgIV2jYJ5gGsBmw_f7P62KTK";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let companies = [];
let activeDispatchers = [];

async function loginUser() {
    const username = document.getElementById("login_username").value.trim();
    const password = document.getElementById("login_password").value.trim();

    const { data, error } = await client
        .from("taxi_users")
        .select("*")
        .eq("username", username)
        .eq("password", password)
        .single();

    if (error || !data) {
        alert("Login fehlgeschlagen");
        return;
    }

    currentUser = data;
    localStorage.setItem("taxiUser", JSON.stringify(data));
    startApp();
}

function logoutUser() {
    localStorage.removeItem("taxiUser");
    location.reload();
}

async function startApp() {
    const savedUser = localStorage.getItem("taxiUser");
    if (!savedUser) return;

    currentUser = JSON.parse(savedUser);

    document.getElementById("loginBox").style.display = "none";
    document.getElementById("appBox").style.display = "block";
    document.getElementById("currentUserName").innerText = currentUser.display_name;
    document.getElementById("currentUserRole").innerText = currentUser.role;

    await loadDispatchers();
    await loadCompanies();
    updateJobForm();
    await loadJobs();

    if (currentUser.role === "admin") {
        document.getElementById("adminPanel").style.display = "block";
        loadUsers();
    }
}

function canUseDispatcher() {
    return currentUser && (
        currentUser.role === "admin" ||
        currentUser.role === "leitstelle"
    );
}

function isActiveDispatcher() {
    return activeDispatchers.some(d => d.username === currentUser.username);
}

async function loadDispatchers() {
    const { data, error } = await client
        .from("taxi_dispatchers")
        .select("*")
        .eq("active", true)
        .order("started_at", { ascending: true });

    if (error) {
        console.error(error);
        return;
    }

    activeDispatchers = data || [];
    renderDispatchers();
}

function renderDispatchers() {
    const box = document.getElementById("dispatcher_status");
    const createBox = document.getElementById("createJobBox");

    let html = "<strong>Aktive Leitstelle:</strong><br>";

    if (activeDispatchers.length === 0) {
        html += "Keine Leitstelle aktiv.";
    } else {
        activeDispatchers.forEach((dispatcher, index) => {
            html += `${index + 1}. ${dispatcher.display_name}<br>`;
        });
    }

    html += `<br><small>${activeDispatchers.length}/2 Plätze belegt</small>`;

    if (!canUseDispatcher()) {
        html += `<br><br><strong>Du kannst die Leitstelle nicht übernehmen.</strong>`;
    }

    box.innerHTML = html;

    if (canUseDispatcher() && isActiveDispatcher()) {
        createBox.classList.remove("locked-box");
    } else {
        createBox.classList.add("locked-box");
    }
}

async function takeDispatcher() {
    if (!canUseDispatcher()) {
        alert("Nur Admin oder Leitstelle kann die Leitstelle übernehmen.");
        return;
    }

    await loadDispatchers();

    if (isActiveDispatcher()) {
        alert("Du bist bereits aktive Leitstelle.");
        return;
    }

    if (activeDispatchers.length >= 2) {
        alert("Es sind bereits 2 Leitstellen aktiv.");
        return;
    }

    const { error } = await client
        .from("taxi_dispatchers")
        .insert([{
            username: currentUser.username,
            display_name: currentUser.display_name,
            active: true
        }]);

    if (error) {
        alert("Leitstelle konnte nicht übernommen werden.");
        console.error(error);
        return;
    }

    await loadDispatchers();
}

async function leaveDispatcher() {
    if (!canUseDispatcher()) {
        alert("Keine Berechtigung.");
        return;
    }

    const { error } = await client
        .from("taxi_dispatchers")
        .update({ active: false })
        .eq("username", currentUser.username)
        .eq("active", true);

    if (error) {
        alert("Leitstelle konnte nicht abgegeben werden.");
        console.error(error);
        return;
    }

    await loadDispatchers();
}

async function loadCompanies() {
    const { data, error } = await client
        .from("taxi_companies")
        .select("*")
        .eq("active", true)
        .order("company_name", { ascending: true });

    if (error) {
        console.error(error);
        return;
    }

    companies = data || [];

    const select = document.getElementById("job_company_name");
    select.innerHTML = "";

    companies.forEach(company => {
        select.innerHTML += `<option>${company.company_name}</option>`;
    });
}

function updateJobForm() {
    const rideType = document.getElementById("job_ride_type").value;

    document.getElementById("companyField").style.display =
        rideType === "Essenslieferung" ? "flex" : "none";

    document.getElementById("emsField").style.display =
        rideType === "EMS" ? "flex" : "none";

    if (rideType === "Essenslieferung") {
        setPickupFromCompany();
    }
}

function setPickupFromCompany() {
    const companyName = document.getElementById("job_company_name").value;

    if (companyName) {
        document.getElementById("job_pickup_location").value = companyName;
    }
}

async function checkBambiTour(playerName) {
    if (!playerName) return false;

    const { data, error } = await client
        .from("taxi_bambi_tours")
        .select("*")
        .ilike("player_name", playerName)
        .maybeSingle();

    if (error) {
        console.error(error);
        return false;
    }

    return !!data;
}

async function createJob() {
    if (!isActiveDispatcher()) {
        alert("Du musst zuerst die Leitstelle übernehmen.");
        return;
    }

    const ride_type = document.getElementById("job_ride_type").value;
    const pickup_location = document.getElementById("job_pickup_location").value.trim();
    const destination = document.getElementById("job_destination").value.trim();
    const customer_name = document.getElementById("job_customer_name").value.trim();
    const company_name = document.getElementById("job_company_name").value;
    const ems_staff_name = document.getElementById("job_ems_staff_name").value.trim();
    const notes = document.getElementById("job_notes").value.trim();

    if (!pickup_location) {
        alert("Bitte Abholort eintragen.");
        return;
    }

    if (ride_type === "Bambi-Tour" && !customer_name) {
        alert("Bei Bambi-Touren muss der Spielername eingetragen werden.");
        return;
    }

    if (ride_type === "Bambi-Tour") {
        const alreadyHadTour = await checkBambiTour(customer_name);

        if (alreadyHadTour) {
            alert("ACHTUNG: Dieser Spieler hatte bereits eine Bambi-Tour!");
            return;
        }
    }

    const { error } = await client
        .from("taxi_jobs")
        .insert([{
            created_by: currentUser.display_name,
            job_status: "Offen",
            ride_type,
            pickup_location,
            destination,
            customer_name,
            company_name: ride_type === "Essenslieferung" ? company_name : null,
            ems_staff_name: ride_type === "EMS" ? ems_staff_name : null,
            notes
        }]);

    if (error) {
        alert("Auftrag konnte nicht erstellt werden.");
        console.error(error);
        return;
    }

    alert("Auftrag erstellt.");

    document.getElementById("job_pickup_location").value = "";
    document.getElementById("job_destination").value = "";
    document.getElementById("job_customer_name").value = "";
    document.getElementById("job_ems_staff_name").value = "";
    document.getElementById("job_notes").value = "";

    updateJobForm();
    loadJobs();
}

async function takeJob(jobId) {
    const { error } = await client
        .from("taxi_jobs")
        .update({
            job_status: "Übernommen",
            assigned_driver: currentUser.display_name,
            assigned_at: new Date().toISOString()
        })
        .eq("id", jobId)
        .eq("job_status", "Offen");

    if (error) {
        alert("Auftrag konnte nicht übernommen werden.");
        console.error(error);
        return;
    }

    loadJobs();
}

function getFareLabel(rideType) {
    if (rideType === "EMS") return "Interne EMS-Abrechnung";
    if (rideType === "Gebrauchtwagenhändler") return "Interne Händler-Abrechnung";
    if (rideType === "Bambi-Tour") return "Kostenlose Fahrt";
    return "Rechnung ohne Trinkgeld";
}

function calculatePreview(jobId, rideType) {
    const km = Number(document.getElementById(`km_${jobId}`)?.value || 0);
    const invoice = Number(document.getElementById(`invoice_${jobId}`)?.value || 0);
    const foodCost = Number(document.getElementById(`food_${jobId}`)?.value || 0);

    let fare = km * 5;
    let tip = 0;

    if (rideType === "Bambi-Tour") {
        fare = 0;
        tip = invoice;
    }

    if (rideType === "Normale Fahrt") {
        tip = invoice - fare;
    }

    if (rideType === "Essenslieferung") {
        tip = invoice - foodCost - fare;
    }

    if (rideType === "EMS" || rideType === "Gebrauchtwagenhändler") {
        tip = invoice;
    }

    document.getElementById(`preview_fare_${jobId}`).innerText = `${fare}$`;
    document.getElementById(`preview_tip_${jobId}`).innerText = `${tip}$`;
}

async function completeJob(jobId, rideType) {
    const kilometers = Number(document.getElementById(`km_${jobId}`).value);
    const invoice_amount = Number(document.getElementById(`invoice_${jobId}`).value);
    const final_destination = document.getElementById(`destination_${jobId}`).value.trim();
    const final_customer = document.getElementById(`customer_${jobId}`).value.trim();
    const foodCostInput = document.getElementById(`food_${jobId}`);
    const notesInput = document.getElementById(`done_notes_${jobId}`);

    const food_cost = foodCostInput ? Number(foodCostInput.value) : 0;
    const done_notes = notesInput.value.trim();

    if (kilometers < 0) {
        alert("Kilometer dürfen nicht negativ sein.");
        return;
    }

    if (invoice_amount < 0) {
        alert("Rechnung darf nicht negativ sein.");
        return;
    }

    if (!final_destination) {
        alert("Bitte Ziel eintragen.");
        return;
    }

    if (rideType === "Bambi-Tour" && !final_customer) {
        alert("Bei Bambi-Touren muss der Spielername eingetragen werden.");
        return;
    }

    if (rideType === "Essenslieferung" && !final_customer) {
        alert("Bitte eintragen, wer das Essen bekommt.");
        return;
    }

    let fare_amount = kilometers * 5;
    let tip_amount = 0;
    let billed_to = "Kunde";

    if (rideType === "Bambi-Tour") {
        fare_amount = 0;
        billed_to = "Kostenlos";
        tip_amount = invoice_amount;
    }

    if (rideType === "Normale Fahrt") {
        tip_amount = invoice_amount - fare_amount;
    }

    if (rideType === "Essenslieferung") {
        tip_amount = invoice_amount - food_cost - fare_amount;
    }

    if (rideType === "EMS") {
        billed_to = "EMS";
        tip_amount = invoice_amount;
    }

    if (rideType === "Gebrauchtwagenhändler") {
        billed_to = "Gebrauchtwagenhändler";
        tip_amount = invoice_amount;
    }

    if (tip_amount < 0) {
        const ok = confirm("Achtung: Das errechnete Trinkgeld ist negativ. Trotzdem speichern?");
        if (!ok) return;
    }

    const { data: jobData, error: jobLoadError } = await client
        .from("taxi_jobs")
        .select("*")
        .eq("id", jobId)
        .single();

    if (jobLoadError) {
        alert("Auftrag konnte nicht geladen werden.");
        console.error(jobLoadError);
        return;
    }

    const { error } = await client
        .from("taxi_jobs")
        .update({
            job_status: "Erledigt",
            completed_at: new Date().toISOString(),
            customer_name: final_customer,
            destination: final_destination,
            kilometers,
            fare_amount,
            invoice_amount,
            tip_amount,
            food_cost,
            food_paid_by: "",
            refund_amount: 0,
            billed_to,
            notes: done_notes || jobData.notes
        })
        .eq("id", jobId);

    if (error) {
        alert("Fahrt konnte nicht abgeschlossen werden.");
        console.error(error);
        return;
    }

    await client
        .from("taxi_rides")
        .insert([{
            driver_name: currentUser.display_name,
            customer_name: final_customer,
            ride_type: jobData.ride_type,
            start_location: jobData.pickup_location,
            end_location: final_destination,
            kilometers,
            fare_amount,
            tip_amount,
            food_advance: food_cost,
            advance_source: "",
            billed_to,
            notes: done_notes || jobData.notes
        }]);

    if (rideType === "Bambi-Tour" && final_customer) {
        await client
            .from("taxi_bambi_tours")
            .insert([{
                player_name: final_customer,
                driver_name: currentUser.display_name,
                notes: done_notes || jobData.notes
            }]);
    }

    alert("Fahrt abgeschlossen.");
    loadJobs();
}

async function loadJobs() {
    await loadOpenJobs();
    await loadMyJobs();
    await loadDoneJobs();
    await loadDispatchers();
}

async function loadOpenJobs() {
    const box = document.getElementById("open_jobs_list");

    const { data, error } = await client
        .from("taxi_jobs")
        .select("*")
        .eq("job_status", "Offen")
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    box.innerHTML = "";

    data.forEach(job => {
        box.innerHTML += `
            <div class="ride-card">
                <strong>${job.ride_type}</strong><br>
                📍 Abholung: ${job.pickup_location || "-"}<br>
                🎯 Ziel: ${job.destination || "-"}<br>
                👤 Kunde/Empfänger: ${job.customer_name || "-"}<br>
                🏢 Firma: ${job.company_name || "-"}<br>
                🚑 EMS: ${job.ems_staff_name || "-"}<br>
                📝 ${job.notes || "-"}<br>
                <button class="small-btn" onclick="takeJob('${job.id}')">Übernehmen</button>
            </div>
        `;
    });
}

async function loadMyJobs() {
    const box = document.getElementById("my_jobs_list");

    const { data, error } = await client
        .from("taxi_jobs")
        .select("*")
        .eq("job_status", "Übernommen")
        .eq("assigned_driver", currentUser.display_name)
        .order("assigned_at", { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    box.innerHTML = "";

    data.forEach(job => {
        const foodFields = job.ride_type === "Essenslieferung" ? `
            <div class="field">
                <label>Essenskosten</label>
                <input type="number" id="food_${job.id}" value="0" oninput="calculatePreview('${job.id}', '${job.ride_type}')">
            </div>
        ` : "";

        box.innerHTML += `
            <div class="ride-card">
                <strong>${job.ride_type}</strong><br>
                📍 Abholung: ${job.pickup_location || "-"}<br>
                🏢 Firma: ${job.company_name || "-"}<br>
                🚑 EMS: ${job.ems_staff_name || "-"}<br>
                📝 ${job.notes || "-"}<br><br>

                <div class="form-grid">
                    <div class="field">
                        <label>Kunde / Empfänger</label>
                        <input type="text" id="customer_${job.id}" value="${job.customer_name || ""}">
                    </div>

                    <div class="field">
                        <label>Ziel</label>
                        <input type="text" id="destination_${job.id}" value="${job.destination || ""}">
                    </div>

                    <div class="field">
                        <label>Kilometer</label>
                        <input type="number" id="km_${job.id}" value="0" oninput="calculatePreview('${job.id}', '${job.ride_type}')">
                    </div>

                    <div class="field">
                        <label>${getFareLabel(job.ride_type)}</label>
                        <div class="preview-box" id="preview_fare_${job.id}">0$</div>
                    </div>

                    <div class="field">
                        <label>Ausgestellte Rechnung</label>
                        <input type="number" id="invoice_${job.id}" value="0" oninput="calculatePreview('${job.id}', '${job.ride_type}')">
                    </div>

                    <div class="field">
                        <label>Errechnetes Trinkgeld</label>
                        <div class="preview-box" id="preview_tip_${job.id}">0$</div>
                    </div>

                    ${foodFields}

                    <div class="field">
                        <label>Abschluss-Bemerkung</label>
                        <input type="text" id="done_notes_${job.id}">
                    </div>
                </div>

                <button onclick="completeJob('${job.id}', '${job.ride_type}')">Fahrt abschließen</button>
            </div>
        `;

        setTimeout(() => calculatePreview(job.id, job.ride_type), 0);
    });
}

async function loadDoneJobs() {
    const box = document.getElementById("done_jobs_list");

    const { data, error } = await client
        .from("taxi_jobs")
        .select("*")
        .eq("job_status", "Erledigt")
        .order("completed_at", { ascending: false })
        .limit(20);

    if (error) {
        console.error(error);
        return;
    }

    box.innerHTML = "";

    data.forEach(job => {
        box.innerHTML += `
            <div class="ride-card">
                <strong>${job.assigned_driver}</strong> (${job.ride_type})<br><br>
                👤 Kunde/Empfänger: ${job.customer_name || "-"}<br>
                📍 ${job.pickup_location || "-"} → ${job.destination || "-"}<br>
                🚕 ${job.kilometers || 0} KM<br>
                💰 Fahrtkosten / interne Abrechnung: ${job.fare_amount || 0}$<br>
                🧾 Rechnung: ${job.invoice_amount || 0}$<br>
                🎁 Trinkgeld: ${job.tip_amount || 0}$<br>
                🍔 Essenskosten: ${job.food_cost || 0}$<br>
                🧾 Rechnung an: ${job.billed_to || "-"}
            </div>
        `;
    });
}

async function createUser() {
    if (!currentUser || currentUser.role !== "admin") {
        alert("Keine Berechtigung");
        return;
    }

    const username = document.getElementById("new_username").value.trim();
    const display_name = document.getElementById("new_display_name").value.trim();
    const password = document.getElementById("new_password").value.trim();
    const role = document.getElementById("new_role").value;

    const { error } = await client
        .from("taxi_users")
        .insert([{ username, display_name, password, role, active: true }]);

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
}

async function loadUsers() {
    if (!currentUser || currentUser.role !== "admin") return;

    const usersList = document.getElementById("users_list");

    const { data, error } = await client
        .from("taxi_users")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    usersList.innerHTML = "";

    data.forEach(user => {
        usersList.innerHTML += `
            <div class="ride-card">
                <strong>${user.display_name}</strong><br>
                Benutzer: ${user.username}<br>
                Rolle: ${user.role}<br>
                Aktiv: ${user.active ? "Ja" : "Nein"}
            </div>
        `;
    });
}

async function createCompany() {
    if (!currentUser || currentUser.role !== "admin") {
        alert("Keine Berechtigung");
        return;
    }

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

    alert("Unternehmen hinzugefügt.");

    document.getElementById("new_company_name").value = "";

    await loadCompanies();
    updateJobForm();
}

startApp();
