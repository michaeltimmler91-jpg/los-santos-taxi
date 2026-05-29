let currentUser = null;
let companies = [];
let activeDispatchers = [];
let currentDriverStatus = "Offline";
let realtimeStarted = false;
let taxiLiveChannel = null;
let fallbackRefreshTimer = null;
let knownOpenJobIds = new Set();
let openJobsInitialized = false;
let idleTimer = null;
let idleConfirmTimer = null;
let lastHeartbeatUpdate = null;
let deliveriesEnabled = true;
let refreshInProgress = false;
let reconnectTimeout = null;
let lastSoundTime = 0;
let lastToastTime = 0;
let bambiToursEnabled = true;

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
    await loadDeliveryControl();

    updateJobForm();

    await loadJobs();
    await checkAnnouncements();
    await loadBambiControl();

    setupRealtime();
    startFallbackRefresh();
    setupRealtimeReconnectWatcher();
    loadSoundSettings();
    startIdleWatcher();
}

function setupRealtime() {
    if (realtimeStarted) return;

    realtimeStarted = true;

    taxiLiveChannel = client
        .channel("taxi-live")
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "taxi_jobs"
            },
            async (payload) => {
                await refreshTaxiData();
            }
        )
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "taxi_dispatchers"
            },
            async () => {
                await refreshTaxiData();
            }
        )
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "taxi_driver_status"
            },
            async () => {
                await refreshTaxiData();
            }
        )
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "taxi_settings"
            },
            async (payload) => {
                if (
                    payload.new &&
                    payload.new.key === "deliveries_enabled"
                ) {
                    deliveriesEnabled = payload.new.value === "true";
                    renderDeliveryControl();
                }

                await refreshTaxiData();
            }
        )
        .subscribe((status) => {
            console.log("Taxi Realtime:", status);
        });
}

async function refreshTaxiData() {

    if (!currentUser) return;
    if (refreshInProgress) return;

    refreshInProgress = true;

    try {
        const active = document.activeElement;

        const isEditing =
            active &&
            (
                active.tagName === "INPUT" ||
                active.tagName === "TEXTAREA" ||
                active.tagName === "SELECT"
            );

        if (isEditing) {
            await Promise.all([
                loadOpenJobs(),
                loadDoneJobs(),
                loadDashboardStats(),
                loadDriverStatus(),
                loadDispatchers(),
                loadMyTimeStats()
            ]);

            return;
        }

        await Promise.all([
            loadOpenJobs(),
            loadDoneJobs(),
            loadDashboardStats(),
            loadDriverStatus(),
            loadDispatchers(),
            loadMyTimeStats()
        ]);
    }
    catch (error) {
        console.error("refreshTaxiData Fehler:", error);
    }
    finally {
        refreshInProgress = false;
    }
}

function restartRealtime() {

    clearTimeout(reconnectTimeout);

    reconnectTimeout = setTimeout(() => {

        if (taxiLiveChannel) {
            client.removeChannel(taxiLiveChannel);
        }

        taxiLiveChannel = null;
        realtimeStarted = false;

        setupRealtime();

    }, 1000);
}

function startFallbackRefresh() {
    if (fallbackRefreshTimer) {
        clearInterval(fallbackRefreshTimer);
    }

    fallbackRefreshTimer = setInterval(async () => {
        await refreshTaxiData();
    }, 15000);
}

function setupRealtimeReconnectWatcher() {

    window.addEventListener("focus", async () => {
        restartRealtime();
        await refreshTaxiData();
    });

    document.addEventListener("visibilitychange", async () => {
        if (!document.hidden) {
            restartRealtime();
            await refreshTaxiData();
        }
    });

    window.addEventListener("online", async () => {
        restartRealtime();
        await refreshTaxiData();
    });
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
    renderDeliveryControl();
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

    await setDeliveriesEnabled(false);

    deliveriesEnabled = false;

    renderDeliveryControl();

    showToast(
        "🚚 Lieferungen deaktiviert",
        "Leitstelle wurde verlassen."
    );

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

async function loadBambiControl() {

    bambiToursEnabled =
    await getBambiToursEnabled();

    renderBambiControl();
}

function renderBambiControl() {

    const box =
    document.getElementById("bambiControlBox");

    const status =
    document.getElementById("bambi_status_text");

    const button =
    document.getElementById("bambiToggleBtn");

    if (!box || !status || !button) {
        return;
    }

    if (!isActiveDispatcher()) {

        box.style.display = "none";

        return;
    }

    box.style.display = "block";

    if (bambiToursEnabled) {

        status.innerHTML = `
            <div class="delivery-status delivery-status-open">
                🟢 Bambi-Touren aktiv
            </div>
        `;

        button.innerText =
        "🐣 Bambi-Touren deaktivieren";

    }
    else {

        status.innerHTML = `
            <div class="delivery-status delivery-status-closed">
                🔴 Bambi-Touren deaktiviert
            </div>
        `;

        button.innerText =
        "🐣 Bambi-Touren aktivieren";
    }
}

async function toggleBambiToursEnabled() {

    const ok =
    await setBambiToursEnabled(
        !bambiToursEnabled
    );

    if (!ok) {
        alert("Speichern fehlgeschlagen.");
        return;
    }

    bambiToursEnabled =
    !bambiToursEnabled;

    renderBambiControl();
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

    const drivers = data || [];

    const own = drivers.find(d => d.username === currentUser.username);
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

    if (!activeBox) {
        renderDispatchers();
        return;
    }

    const activeDrivers = drivers.filter(d => d.status === "Im Dienst");
const pausedDrivers = drivers.filter(d => d.status === "Pause");

const { data: takenJobs } = await client
    .from("taxi_jobs")
    .select("assigned_driver")
    .eq("job_status", "Übernommen");

const busyDriverNames = (takenJobs || [])
    .map(job => job.assigned_driver)
    .filter(Boolean);

const freeDrivers = activeDrivers.filter(driver =>
    !busyDriverNames.includes(driver.display_name)
);

const busyDrivers = activeDrivers.filter(driver =>
    busyDriverNames.includes(driver.display_name)
);

    let html = `
        <div class="driver-mini-stats">
            <div>
                <strong>${freeDrivers.length}</strong>
                <span>Frei</span>
            </div>

            <div>
                <strong>${pausedDrivers.length}</strong>
                <span>Pause</span>
            </div>
            <div>
                <strong>${busyDrivers.length}</strong>
                <span>Auf Fahrt</span>
            </div>
        </div>
    `;

    if (freeDrivers.length > 0) {
        html += `<div class="driver-group-title">🟢 Verf&uuml;gbar</div>`;

        freeDrivers.forEach(driver => {
            html += `
                <div class="driver-row driver-online">
                    <span>${escapeHtml(driver.display_name)}</span>
                    <small>Dienst</small>
                </div>
            `;
        });
    }

    if (busyDrivers.length > 0) {
    html += `<div class="driver-group-title">🚕 Auf Fahrt</div>`;

    busyDrivers.forEach(driver => {
        html += `
            <div class="driver-row driver-busy">
                <span>${escapeHtml(driver.display_name)}</span>
                <small>Fahrt</small>
            </div>
        `;
    });
}

    if (pausedDrivers.length > 0) {
        html += `<div class="driver-group-title">🟡 Pause</div>`;

        pausedDrivers.forEach(driver => {
            html += `
                <div class="driver-row driver-pause">
                    <span>${escapeHtml(driver.display_name)}</span>
                    <small>Pause</small>
                </div>
            `;
        });
    }

    if (activeDrivers.length === 0 && pausedDrivers.length === 0) {
        html += `
            <div class="empty-mini">
                Keine Fahrer im Dienst.
            </div>
        `;
    }

    activeBox.innerHTML = html;

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
    await refreshTaxiData();
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
    await loadMyJobs();
    await refreshTaxiData();
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
    await setDriverStatus("Im Dienst");
    await loadMyJobs();
    await refreshTaxiData();
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
    await setDriverStatus("Im Dienst");
    await loadMyJobs();
    await refreshTaxiData();
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
    await setDriverStatus("Im Dienst");
    await loadMyJobs();
    await refreshTaxiData();
}

async function loadJobs() {
    await Promise.all([
        loadOpenJobs(),
        loadMyJobs(),
        loadDoneJobs(),
        loadDashboardStats(),
        loadMyTimeStats()
    ]);
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
    const data = await getOpenJobs();

    const currentIds = new Set((data || []).map(job => job.id));

const newJobs = (data || []).filter(job =>
    !knownOpenJobIds.has(job.id)
);

if (openJobsInitialized && newJobs.length > 0) {
    playNewJobSound();

    showToast(
        "📞 Neuer Auftrag",
        `${newJobs[0].ride_type} • ${newJobs[0].pickup_location || "Unbekannt"}`
    );
}

knownOpenJobIds = currentIds;
openJobsInitialized = true;

    box.innerHTML = "";

    if (!data || data.length === 0) {
        box.innerHTML = `
            <div class="admin-card empty-state-card">
                <strong>📭 Keine offenen Fahrten</strong><br>
                Aktuell ist alles ruhig. Noch.
            </div>
        `;
        return;
    }

    data.forEach(job => {
        const companyLine = job.company_name
            ? `<div>🏢 ${escapeHtml(job.company_name)}</div>`
            : "";

        const emsLine = job.ems_staff_name
            ? `<div>🚑 ${escapeHtml(job.ems_staff_name)}</div>`
            : "";

        const notesLine = job.notes
            ? `<div>📝 ${escapeHtml(job.notes)}</div>`
            : "";

        box.innerHTML += `
            <div class="ride-card ride-card-modern">
                <div class="ride-top">
                    <span class="ride-type-badge">${escapeHtml(job.ride_type || "Fahrt")}</span>
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
                    ${companyLine}
                    ${emsLine}
                    ${notesLine}
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

    box.innerHTML = "";

    const { data, error } = await client
        .from("taxi_jobs")
        .select("*")
        .eq("job_status", "Übernommen")
        .eq("assigned_driver", currentUser.display_name)
        .order("assigned_at", { ascending: false });

    if (error) {
        console.error(error);

        box.innerHTML = `
            <div class="admin-card empty-state-card">
                <strong>❌ Fehler beim Laden</strong><br>
                Deine Fahrten konnten nicht geladen werden.
            </div>
        `;

        return;
    }

    if (!data || data.length === 0) {
        box.innerHTML = `
            <div class="admin-card empty-state-card">
                <strong>🚕 Keine eigene Fahrt</strong><br>
                Du hast aktuell keinen Auftrag übernommen.
            </div>
        `;

        return;
    }

    data.forEach(job => {
        const companyLine = job.company_name
            ? `<div>🏢 ${escapeHtml(job.company_name)}</div>`
            : "";

        const emsLine = job.ems_staff_name
            ? `<div>🚑 ${escapeHtml(job.ems_staff_name)}</div>`
            : "";

        const notesLine = job.notes
            ? `<div>📝 ${escapeHtml(job.notes)}</div>`
            : "";

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
                        Firma / Schlie&szlig;fach
                    </option>

                    <option value="fahrer" ${job.food_paid_by === "fahrer" ? "selected" : ""}>
                        Fahrer privat
                    </option>
                </select>
            </div>
        ` : "";

        box.innerHTML += `
            <div class="ride-card ride-card-modern ride-card-taken">
                <div class="ride-top">
                    <span class="ride-type-badge">${escapeHtml(job.ride_type || "Fahrt")}</span>
                    <span class="ride-status-badge taken">&Uuml;bernommen</span>
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
                    ${companyLine}
                    ${emsLine}
                    ${notesLine}
                </div>

                <div class="ride-edit-box">
                    <div class="form-grid">
                        <div class="field">
                            <label>Kunde / Empf&auml;nger</label>
                            <input type="text" id="customer_${job.id}" value="${escapeAttr(job.customer_name || "")}">
                        </div>

                        <div class="field">
                            <label>Ziel</label>
                            <input type="text" id="destination_${job.id}" value="${escapeAttr(job.destination || "")}">
                        </div>

                        <div class="field">
                            <label>Kilometer</label>
                            <input
                                type="number"
                                id="km_${job.id}"
                                value="0"
                                oninput="calculatePreview('${job.id}', '${job.ride_type}')"
                            >
                        </div>

                        <div class="field">
                            <label>${getFareLabel(job.ride_type)}</label>
                            <div class="preview-box" id="preview_fare_${job.id}">0$</div>
                        </div>

                        <div class="field">
                            <label>Ausgestellte Rechnung</label>
                            <input
                                type="number"
                                id="invoice_${job.id}"
                                value="0"
                                oninput="calculatePreview('${job.id}', '${job.ride_type}')"
                            >
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

                    <div class="ride-actions">
                        <button onclick="completeJob('${job.id}', '${job.ride_type}')">
                            ✅ Fahrt abschlie&szlig;en
                        </button>

                        <button class="small-btn secondary-btn" onclick="releaseJob('${job.id}')">
                            ↩️ Auftrag freigeben
                        </button>

                        <button class="small-btn danger-btn" onclick="markNoShow('${job.id}')">
                            ❌ Fahrgast nicht angetroffen
                        </button>
                    </div>
                </div>
            </div>
        `;

        setTimeout(() => calculatePreview(job.id, job.ride_type), 0);
    });
}

async function loadDoneJobs() {

    const box = document.getElementById("done_jobs_list");
    const data = await getDoneJobs(20);

    box.innerHTML = "";

    if (!data || data.length === 0) {
        box.innerHTML = `
            <div class="admin-card empty-state-card">
                <strong>📦 Keine letzten Fahrten</strong><br>
                Hier erscheinen sp&auml;ter abgeschlossene Fahrten.
            </div>
        `;

        return;
    }

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

        const notesLine = job.notes
            ? `<span>📝 ${escapeHtml(job.notes)}</span>`
            : "";

        box.innerHTML += `
            <div class="done-row done-row-modern">

                <div class="done-line-top">
                    <strong>${escapeHtml(job.assigned_driver || "-")}</strong>

                    <span class="done-type">
                        ${escapeHtml(job.ride_type || "Fahrt")}
                    </span>
                </div>

                <div class="done-route">
                    📍 ${escapeHtml(job.pickup_location || "-")}
                    <span>→</span>
                    ${escapeHtml(job.destination || "-")}
                </div>

                <div class="done-line-bottom">
                    <span
                        title="&Uuml;bernommen: ${assignedFull}
Abgeschlossen: ${completedFull}"
                    >
                        🕒 ${assignedTime} → ${completedTime}
                    </span>

                    <span>🚕 ${job.kilometers || 0} KM</span>
                    <span>🧾 ${job.invoice_amount || 0}$</span>
                    <span>🎁 ${job.tip_amount || 0}$</span>
                    ${notesLine}
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
    const now = Date.now();

    if (!force && now - lastSoundTime < 3000) {
        return;
    }

    lastSoundTime = now;
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


let currentAnnouncement = null;

async function checkAnnouncements() {

    const data =
        await getActiveRequiredAnnouncements();

    if (!data || data.length === 0) return;

    for (const info of data) {

        const readData =
            await getAnnouncementRead(
                info.id,
                currentUser.username
            );

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
    const saved = await saveAnnouncementRead(
        currentAnnouncement.id,
        currentUser
    );

    if (!saved) {
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

    const day = startWeek.getDay();

    const diff =
        day === 0
            ? 6
            : day - 1;

    startWeek.setDate(
        startWeek.getDate() - diff
    );

    startWeek.setHours(0,0,0,0);

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
    <div class="time-stat-block compact-time">

        <div class="time-section">
            <strong>Heute</strong>

            <div class="time-row">
                <span>🟢 Dienst</span>
                <span class="time-value">${formatSeconds(todayDuty)}</span>
            </div>

            <div class="time-row">
                <span>🟡 Pause</span>
                <span class="time-value">${formatSeconds(todayPause)}</span>
            </div>
        </div>

        <div class="time-section">
            <strong>Diese Woche</strong>

            <div class="time-row">
                <span>🟢 Dienst</span>
                <span class="time-value">${formatSeconds(weekDuty)}</span>
            </div>

            <div class="time-row">
                <span>🟡 Pause</span>
                <span class="time-value">${formatSeconds(weekPause)}</span>
            </div>
        </div>

    </div>
`;
}
function updateLiveClock() {

    const box =
    document.getElementById("live_clock");

    if (!box) {
        return;
    }

    const now = new Date();

    box.innerHTML =
        "🟢 Live • " +
        now.toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
}

setInterval(updateLiveClock, 1000);
window.addEventListener("load", () => {
    startApp();
});


/* =========================
   LIEFERSTOPP / LIEFERSTATUS
========================= */

async function loadDeliveryControl() {

    if (typeof getDeliveriesEnabled !== "function") {
        return;
    }

    deliveriesEnabled =
    await getDeliveriesEnabled();

    renderDeliveryControl();
}

function canManageDeliveries() {

    if (!currentUser) {
        return false;
    }

    return isActiveDispatcher();
}

function renderDeliveryControl() {

    const deliveryBox =
document.getElementById("deliveryControlBox");

const statusBox =
document.getElementById("delivery_status_text");

const button =
document.getElementById("deliveryToggleBtn");

if (!deliveryBox || !statusBox || !button) {
    return;
}
if (!canManageDeliveries()) {

    deliveryBox.style.display = "none";

    return;
}
deliveryBox.style.display = "block";
    if (deliveriesEnabled) {

        statusBox.innerHTML = `
            <div class="delivery-status delivery-status-open">
                🟢 Lieferungen aktiv
            </div>
            <small>
                Firmen k&ouml;nnen Lieferauftr&auml;ge senden.
            </small>
        `;

        button.innerText =
        "🚚 Lieferungen deaktivieren";

        button.classList.add(
            "danger-btn"
        );

    } else {

        statusBox.innerHTML = `
            <div class="delivery-status delivery-status-closed">
                🔴 Lieferungen deaktiviert
            </div>
            <small>
                Firmen sehen einen Stopp-Hinweis und k&ouml;nnen nichts senden.
            </small>
        `;

        button.innerText =
        "✅ Lieferungen freigeben";

        button.classList.remove(
            "danger-btn"
        );
    }
}

async function toggleDeliveriesEnabled() {

    if (!canManageDeliveries()) {
        alert("Nur aktive Leitstelle darf Lieferungen umschalten.");
        return;
    }

    const newValue =
    !deliveriesEnabled;

    const ok =
    await setDeliveriesEnabled(
        newValue
    );

    if (!ok) {
        alert("Lieferstatus konnte nicht gespeichert werden.");
        return;
    }

    deliveriesEnabled =
    newValue;

    renderDeliveryControl();

    showToast(
        "🚚 Lieferstatus",
        deliveriesEnabled
            ? "Lieferungen wurden freigegeben."
            : "Lieferungen wurden deaktiviert."
    );
}
