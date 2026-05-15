const SUPABASE_URL = "https://unkfqoplynwabulnzpar.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_AkIVrLBsgIV2jYJ5gGsBmw_f7P62KTK";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let companies = [];
let activeDispatchers = [];
let currentDriverStatus = "Offline";
let realtimeStarted = false;

let idleTimer = null;
let idleConfirmTimer = null;

const IDLE_LIMIT_MS = 20 * 60 * 1000;
const IDLE_CONFIRM_MS = 60 * 1000;

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

    if (currentUser.role === "admin") {
        document.getElementById("adminLink").style.display = "inline-block";
    }

    await loadDispatchers();
    await loadDriverStatus();
    await loadCompanies();

    updateJobForm();

    await loadJobs();
    await checkAnnouncements();

    setupRealtime();
    loadSoundSettings();
    startIdleWatcher();
}

function setupRealtime() {
    if (realtimeStarted) return;
    realtimeStarted = true;

    client
        .channel("taxi-live")
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "taxi_jobs"
            },
            (payload) => {
                if (
                    payload.eventType === "INSERT" &&
                    payload.new &&
                    payload.new.job_status === "Offen"
                ) {
                    playNewJobSound();

                    showToast(
                        "📞 Neuer Auftrag",
                        `${payload.new.ride_type} • ${payload.new.pickup_location || "Unbekannt"}`
                    );
                }

                loadJobs();
            }
        )
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "taxi_dispatchers"
            },
            () => {
                loadDispatchers();
                loadDashboardStats();
            }
        )
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "taxi_driver_status"
            },
            () => {
                loadDriverStatus();
            }
        )
        .subscribe();
}

function isActiveDispatcher() {
    return activeDispatchers.some(d => d.username === currentUser.username);
}

function canTakeDispatcher() {
    return currentDriverStatus === "Im Dienst" || currentDriverStatus === "Pause";
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
    const dispatcherBtn = document.getElementById("dispatcherToggleBtn");

    if (!box || !createBox || !dispatcherBtn) return;

    let html = "";

    if (activeDispatchers.length === 0) {
        html += "Keine Leitstelle aktiv.";
    } else {
        activeDispatchers.forEach((dispatcher, index) => {
            html += `${index + 1}. ${escapeHtml(dispatcher.display_name)}<br>`;
        });
    }

    html += `<br><small>${activeDispatchers.length}/2 Plätze belegt</small>`;
    box.innerHTML = html;

    if (isActiveDispatcher()) {
        createBox.style.display = "block";
    } else {
        createBox.style.display = "none";
    }

    if (!canTakeDispatcher() && !isActiveDispatcher()) {
        dispatcherBtn.style.display = "none";
    } else {
        dispatcherBtn.style.display = "inline-block";
    }

    updateDispatcherButton();
}

async function toggleDispatcherStatus() {
    if (isActiveDispatcher()) {
        await leaveDispatcher();
    } else {
        await takeDispatcher();
    }

    updateDispatcherButton();
}

function updateDispatcherButton() {
    const btn = document.getElementById("dispatcherToggleBtn");
    if (!btn) return;

    if (isActiveDispatcher()) {
        btn.innerText = "❌ Leitstelle verlassen";
        btn.classList.add("danger-btn");
    } else {
        btn.innerText = "📡 Leitstelle übernehmen";
        btn.classList.remove("danger-btn");
    }
}

async function takeDispatcher() {
    await loadDriverStatus();
    await loadDispatchers();

    if (!canTakeDispatcher()) {
        alert("Du musst auf Dienst oder Pause stehen, um die Leitstelle zu übernehmen.");
        return;
    }

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
    await loadDashboardStats();
}

async function leaveDispatcher() {
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
    await loadDashboardStats();
}

async function setDriverStatus(status) {
    if (status === "Offline" && isActiveDispatcher()) {
        await leaveDispatcher();
    }

    const { error } = await client
        .from("taxi_driver_status")
        .upsert({
            username: currentUser.username,
            display_name: currentUser.display_name,
            status: status,
            updated_at: new Date().toISOString()
        }, {
            onConflict: "username"
        });

    if (error) {
        alert("Status konnte nicht gespeichert werden.");
        console.error(error);
        return;
    }

    await client
    .from("taxi_status_logs")
    .insert([{
        username: currentUser.username,
        display_name: currentUser.display_name,
        old_status: currentDriverStatus,
        new_status: status
    }]);
    
    currentDriverStatus = status;

    await loadDispatchers();
    await loadDriverStatus();
    await loadDashboardStats();
}

async function loadDriverStatus() {
    const { data, error } = await client
        .from("taxi_driver_status")
        .select("*")
        .order("display_name", { ascending: true });

    if (error) {
        console.error(error);
        return;
    }

    const own = data.find(d => d.username === currentUser.username);
    currentDriverStatus = own ? own.status : "Offline";

    const text = document.getElementById("driver_status_text");
    if (text) {
        let badgeClass = "status-offline";
let badgeText = "🔴 Offline";

if (currentDriverStatus === "Im Dienst") {
    badgeClass = "status-online";
    badgeText = "🟢 Im Dienst";
}

if (currentDriverStatus === "Pause") {
    badgeClass = "status-pause";
    badgeText = "🟡 Pause";
}

text.innerHTML = `
    <div class="status-badge ${badgeClass}">
        ${badgeText}
    </div>
`;
    }

    const activeBox = document.getElementById("active_drivers_list");
    if (!activeBox) return;

    const activeDrivers = data.filter(d => d.status === "Im Dienst");
    const pausedDrivers = data.filter(d => d.status === "Pause");

    let html = "";

    if (activeDrivers.length > 0) {
        html += "<br><strong>Im Dienst:</strong><br>";
        activeDrivers.forEach(driver => {
            html += `🟢 ${escapeHtml(driver.display_name)}<br>`;
        });
    }

    if (pausedDrivers.length > 0) {
        html += "<br><strong>Pause:</strong><br>";
        pausedDrivers.forEach(driver => {
            html += `🟡 ${escapeHtml(driver.display_name)}<br>`;
        });
    }

    activeBox.innerHTML = html || "<br>Keine Fahrer im Dienst.";

    renderDispatchers();
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
    if (!select) return;

    select.innerHTML = "";

    companies.forEach(company => {
        select.innerHTML += `<option>${escapeHtml(company.company_name)}</option>`;
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

    await setDriverStatus("Im Dienst");
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
    const foodPaidBy = document.getElementById(`food_paid_by_${jobId}`)?.value || "firma";
    const driveCost = km * 5;

    fare = driveCost + foodCost;

    if (foodPaidBy === "fahrer") {
        tip = invoice - driveCost;
    } else {
        tip = invoice - driveCost - foodCost;
    }
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

    if (kilometers < 0 || invoice_amount < 0 || food_cost < 0) {
        alert("Negative Werte sind nicht erlaubt.");
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
    const foodPaidBy = document.getElementById(`food_paid_by_${jobId}`)?.value || "firma";
    const driveCost = kilometers * 5;

    fare_amount = driveCost + food_cost;

    if (foodPaidBy === "fahrer") {
        tip_amount = invoice_amount - driveCost;
    } else {
        tip_amount = invoice_amount - driveCost - food_cost;
    }
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
            food_paid_by: document.getElementById(`food_paid_by_${jobId}`)?.value || "firma",
            billed_to,
            notes: done_notes || jobData.notes
            })
        .eq("id", jobId);

    if (error) {
        alert("Fahrt konnte nicht abgeschlossen werden.");
        console.error(error);
        return;
    }

    if (rideType === "Bambi-Tour" && final_customer) {
        await client
            .from("taxi_bambi_tours")
            .insert([{
                player_name: final_customer,
                driver_name: currentUser.display_name,
                notes: done_notes || jobData.notes
            }]);
    }

    loadJobs();
}

async function releaseJob(jobId) {
    const ok = confirm("Auftrag wirklich wieder für andere Fahrer freigeben?");
    if (!ok) return;

    const { error } = await client
        .from("taxi_jobs")
        .update({
            job_status: "Offen",
            assigned_driver: null,
            assigned_at: null
        })
        .eq("id", jobId);

    if (error) {
        alert("Auftrag konnte nicht freigegeben werden.");
        console.error(error);
        return;
    }

    loadJobs();
}

async function markNoShow(jobId) {
    const ok = confirm("Fahrgast wirklich als nicht angetroffen markieren?");
    if (!ok) return;

    const { error } = await client
        .from("taxi_jobs")
        .update({
            job_status: "Nicht angetroffen",
            completed_at: new Date().toISOString()
        })
        .eq("id", jobId);

    if (error) {
        alert("Auftrag konnte nicht markiert werden.");
        console.error(error);
        return;
    }

    loadJobs();
}

async function loadJobs() {
    await loadOpenJobs();
    await loadMyJobs();
    await loadDoneJobs();
    await loadDispatchers();
    await loadDriverStatus();
    await loadDashboardStats();
    await loadMyTimeStats();
}

async function loadDashboardStats() {
    const { data, error } = await client
        .from("taxi_jobs")
        .select("job_status");

    if (error) {
        console.error(error);
        return;
    }

    document.getElementById("stat_open").innerText =
        data.filter(job => job.job_status === "Offen").length;

    document.getElementById("stat_taken").innerText =
        data.filter(job => job.job_status === "Übernommen").length;

    document.getElementById("stat_done").innerText =
        data.filter(job => job.job_status === "Erledigt").length;
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
    <div class="ride-card ride-card-modern">
        <div class="ride-top">
            <span class="ride-type-badge">${escapeHtml(job.ride_type)}</span>
            <span class="ride-status-badge">Offen</span>
        </div>

        <div class="ride-route">
            <div>
                <small>Abholung</small>
                <strong>${escapeHtml(job.pickup_location || "-")}</strong>
            </div>

            <div class="ride-arrow">→</div>

            <div>
                <small>Ziel</small>
                <strong>${escapeHtml(job.destination || "-")}</strong>
            </div>
        </div>

        <div class="ride-info-grid">
            <div>👤 ${escapeHtml(job.customer_name || "-")}</div>
            <div>🏢 ${escapeHtml(job.company_name || "-")}</div>
            <div>🚑 ${escapeHtml(job.ems_staff_name || "-")}</div>
            <div>📝 ${escapeHtml(job.notes || "-")}</div>
        </div>

        <div class="ride-actions">
            <button class="small-btn" onclick="takeJob('${job.id}')">
                🚕 Auftrag übernehmen
            </button>
        </div>
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
        <input
            type="number"
            id="food_${job.id}"
            value="${job.food_cost || 0}"
            oninput="calculatePreview('${job.id}', '${job.ride_type}')"
        >
    </div>

    <div class="field">
        <label>Essengeld bezahlt durch</label>
        <select
            id="food_paid_by_${job.id}"
            onchange="calculatePreview('${job.id}', '${job.ride_type}')"
        >
            <option value="firma" ${job.food_paid_by !== "fahrer" ? "selected" : ""}>
                Firma / Schließfach
            </option>

            <option value="fahrer" ${job.food_paid_by === "fahrer" ? "selected" : ""}>
                Fahrer privat
            </option>
        </select>
    </div>
` : "";

        box.innerHTML += `
            <div class="ride-card ride-card-modern">
    <div class="ride-top">
        <span class="ride-type-badge">${escapeHtml(job.ride_type)}</span>
        <span class="ride-status-badge taken">Übernommen</span>
    </div>

    <div class="ride-route">
        <div>
            <small>Abholung</small>
            <strong>${escapeHtml(job.pickup_location || "-")}</strong>
        </div>

        <div class="ride-arrow">→</div>

        <div>
            <small>Ziel</small>
            <strong>${escapeHtml(job.destination || "-")}</strong>
        </div>
    </div>

    <div class="ride-info-grid">
        <div>🏢 ${escapeHtml(job.company_name || "-")}</div>
        <div>🚑 ${escapeHtml(job.ems_staff_name || "-")}</div>
        <div>👤 ${escapeHtml(job.customer_name || "-")}</div>
        <div>📝 ${escapeHtml(job.notes || "-")}</div>
    </div>

                <div class="form-grid">
                    <div class="field">
                        <label>Kunde / Empfänger</label>
                        <input type="text" id="customer_${job.id}" value="${escapeAttr(job.customer_name || "")}">
                    </div>

                    <div class="field">
                        <label>Ziel</label>
                        <input type="text" id="destination_${job.id}" value="${escapeAttr(job.destination || "")}">
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
                <button class="small-btn secondary-btn" onclick="releaseJob('${job.id}')">Auftrag freigeben</button>
                <button class="small-btn danger-btn" onclick="markNoShow('${job.id}')">Fahrgast nicht angetroffen</button>
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

        const assignedTime = job.assigned_at
            ? new Date(job.assigned_at).toLocaleTimeString("de-DE", {
                hour: "2-digit",
                minute: "2-digit"
            })
            : "--:--";

        const completedTime = job.completed_at
            ? new Date(job.completed_at).toLocaleTimeString("de-DE", {
                hour: "2-digit",
                minute: "2-digit"
            })
            : "--:--";

        const assignedFull = job.assigned_at
            ? new Date(job.assigned_at).toLocaleString("de-DE")
            : "-";

        const completedFull = job.completed_at
            ? new Date(job.completed_at).toLocaleString("de-DE")
            : "-";

        box.innerHTML += `
            <div class="done-row">

                <div class="done-line-top">
                    <strong>${escapeHtml(job.assigned_driver || "-")}</strong>

                    <span class="done-dot">•</span>

                    <span>${escapeHtml(job.ride_type || "-")}</span>

                    <span class="done-dot">•</span>

                    <span>
                        📍 ${escapeHtml(job.pickup_location || "-")}
                        →
                        ${escapeHtml(job.destination || "-")}
                    </span>
                </div>

                <div class="done-line-bottom">
                    <span
                        title="Übernommen: ${assignedFull}
Abgeschlossen: ${completedFull}"
                    >
                        🕒 ${assignedTime} → ${completedTime}
                    </span>

                    <span>🚕 ${job.kilometers || 0} KM</span>
                    <span>🧾 ${job.invoice_amount || 0}$</span>
                    <span>🎁 ${job.tip_amount || 0}$</span>
                </div>

            </div>
        `;
    });
}

function loadSoundSettings() {
    const enabled = localStorage.getItem("taxiSoundEnabled");
    const soundFile = localStorage.getItem("taxiSoundFile");
    const volume = localStorage.getItem("taxiSoundVolume") || "0.15";
    const select = document.getElementById("sound_select");
    const btn = document.getElementById("soundToggleBtn");
    const text = document.getElementById("sound_status_text");
    const audio = document.getElementById("newJobSound");
    const volumeInput = document.getElementById("sound_volume");
    const volumeText = document.getElementById("sound_volume_text");

    const soundEnabled = enabled === null ? true : enabled === "true";
    const selectedSound = soundFile || "bing.mp3";

    if (select) select.value = selectedSound;
    if (audio) {
        audio.src = selectedSound;
        audio.volume = Number(volume);
    }

    if (volumeInput) volumeInput.value = volume;
    if (volumeText) volumeText.innerText = `${Math.round(Number(volume) * 100)}%`;

    if (btn) btn.innerText = soundEnabled ? "Sound aus" : "Sound an";
    if (text) text.innerText = soundEnabled ? "Sound: An" : "Sound: Aus";
}

function saveSoundSettings() {
    const select = document.getElementById("sound_select");
    const audio = document.getElementById("newJobSound");
    const volumeInput = document.getElementById("sound_volume");
    const volumeText = document.getElementById("sound_volume_text");

    if (!select || !audio) return;

    localStorage.setItem("taxiSoundFile", select.value);
    audio.src = select.value;

    if (volumeInput) {
        localStorage.setItem("taxiSoundVolume", volumeInput.value);
        audio.volume = Number(volumeInput.value);
    }

    if (volumeInput && volumeText) {
        volumeText.innerText = `${Math.round(Number(volumeInput.value) * 100)}%`;
    }
}

function toggleSound() {
    const current = localStorage.getItem("taxiSoundEnabled");
    const enabled = current === null ? true : current === "true";

    localStorage.setItem("taxiSoundEnabled", String(!enabled));

    loadSoundSettings();
}

function testSound() {
    playNewJobSound(true);
}

function playNewJobSound(force = false) {
    const enabled = localStorage.getItem("taxiSoundEnabled");
    const soundEnabled = enabled === null ? true : enabled === "true";

    if (!soundEnabled && !force) return;

    const sound = document.getElementById("newJobSound");
    if (!sound) return;

    const selectedSound = localStorage.getItem("taxiSoundFile") || "bing.mp3";
    const volume = localStorage.getItem("taxiSoundVolume") || "1";

    sound.src = selectedSound;
    sound.volume = Number(volume) * 0.15;
    sound.currentTime = 0;

    sound.play().catch(() => {
        console.log("Sound konnte nicht abgespielt werden.");
    });
}

function showToast(title, message) {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "toast";

    toast.innerHTML = `
        <div class="toast-title">${escapeHtml(title)}</div>
        <div class="toast-message">${escapeHtml(message)}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 4500);
}

function toggleSection(contentId, arrowId) {

    const content =
        document.getElementById(contentId);

    const arrow =
        document.getElementById(arrowId);

    if (!content || !arrow) return;

    const isHidden =
        content.style.display === "none";

    if (isHidden) {

        content.style.display = "block";
        arrow.innerText = "▼";
    }
    else {

        content.style.display = "none";
        arrow.innerText = "▶";
    }
}

function startIdleWatcher() {
    const events = ["mousemove", "keydown", "click", "touchstart"];

    events.forEach(eventName => {
        document.addEventListener(eventName, resetIdleTimer);
    });

    resetIdleTimer();
}

function resetIdleTimer() {
    clearTimeout(idleTimer);

    idleTimer = setTimeout(() => {
        showIdleWarning();
    }, IDLE_LIMIT_MS);
}

function showIdleWarning() {
    const modal = document.getElementById("idleModal");

    if (modal) {
        modal.style.display = "flex";
    }

    clearTimeout(idleConfirmTimer);

    idleConfirmTimer = setTimeout(async () => {
        await setUserOfflineBecauseIdle();
    }, IDLE_CONFIRM_MS);
}

function confirmStillActive() {
    const modal = document.getElementById("idleModal");

    if (modal) {
        modal.style.display = "none";
    }

    clearTimeout(idleConfirmTimer);
    resetIdleTimer();
}

async function setUserOfflineBecauseIdle() {
    const modal = document.getElementById("idleModal");

    if (modal) {
        modal.style.display = "none";
    }

    await setDriverStatus("Offline");

    alert("Du wurdest wegen Inaktivität auf Offline gesetzt.");
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
let currentAnnouncement = null;

async function checkAnnouncements() {
    const { data, error } = await client
        .from("taxi_announcements")
        .select("*")
        .eq("active", true)
        .eq("must_confirm", true)
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    if (!data || data.length === 0) return;

    for (const info of data) {
        const { data: readData } = await client
            .from("taxi_announcement_reads")
            .select("*")
            .eq("announcement_id", info.id)
            .eq("username", currentUser.username)
            .maybeSingle();

        if (!readData) {
            currentAnnouncement = info;
            showAnnouncementModal(info);
            return;
        }
    }
}

function showAnnouncementModal(info) {
    document.getElementById("announcementContent").innerHTML = `
        <strong>${escapeHtml(info.title)}</strong>
        <br><br>
        ${escapeHtml(info.message).replaceAll("\n", "<br>")}
    `;

    document.getElementById("announcementModal").style.display = "flex";
}

async function confirmAnnouncement() {
    if (!currentAnnouncement) return;

    const { error } = await client
        .from("taxi_announcement_reads")
        .insert([{
            announcement_id: currentAnnouncement.id,
            username: currentUser.username,
            display_name: currentUser.display_name
        }]);

    if (error) {
        console.error(error);
        alert("Bestätigung konnte nicht gespeichert werden.");
        return;
    }

    document.getElementById("announcementModal").style.display = "none";

    currentAnnouncement = null;

    await checkAnnouncements();
}
async function loadMyTimeStats() {

    const box = document.getElementById("my_time_stats");

    if (!box || !currentUser) return;

    const { data, error } = await client
        .from("taxi_status_logs")
        .select("*")
        .eq("username", currentUser.username)
        .order("created_at", { ascending: true });

    if (error) {
        console.error(error);
        box.innerHTML = "Fehler";
        return;
    }

    const now = new Date();

    const startToday = new Date();
    startToday.setHours(0,0,0,0);

    const startWeek = new Date();
    startWeek.setDate(now.getDate() - 7);

    let todayDuty = 0;
    let todayPause = 0;

    let weekDuty = 0;
    let weekPause = 0;

    for (let i = 0; i < data.length; i++) {

        const current = data[i];
        const next = data[i + 1];

        const start = new Date(current.created_at);

        const end = next
            ? new Date(next.created_at)
            : now;

        const diff = Math.floor((end - start) / 1000);

        if (current.new_status === "Im Dienst") {

            if (start >= startToday) {
                todayDuty += diff;
            }

            if (start >= startWeek) {
                weekDuty += diff;
            }
        }

        if (current.new_status === "Pause") {

            if (start >= startToday) {
                todayPause += diff;
            }

            if (start >= startWeek) {
                weekPause += diff;
            }
        }
    }

    box.innerHTML = `
        <div class="time-stat-block">

            <strong>Heute</strong><br>

            🟢 Dienst:
            ${formatSeconds(todayDuty)}<br>

            🟡 Pause:
            ${formatSeconds(todayPause)}

            <br><br>

            <strong>Diese Woche</strong><br>

            🟢 Dienst:
            ${formatSeconds(weekDuty)}<br>

            🟡 Pause:
            ${formatSeconds(weekPause)}

        </div>
    `;
}

function formatSeconds(seconds) {

    const hours = Math.floor(seconds / 3600);

    const minutes = Math.floor(
        (seconds % 3600) / 60
    );

    return `${hours}h ${minutes}m`;
}
startApp();
