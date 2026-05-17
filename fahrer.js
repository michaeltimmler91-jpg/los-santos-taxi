let mobileUser = null;
let mobileCurrentStatus = "Offline";
let mobileDispatchers = [];
let mobileRealtimeStarted = false;
let mobileMode = "driver";
let lastKnownOpenJobIds = [];

document.addEventListener("DOMContentLoaded", () => {
    mobileStart();
});

async function mobileLogin() {
    const username =
    document.getElementById("mobile_login_username").value.trim();

    const password =
    document.getElementById("mobile_login_password").value.trim();

    const { data, error } =
    await client
    .from("taxi_users")
    .select("*")
    .eq("username", username)
    .eq("password", password)
    .single();

    if (error || !data) {
        alert("Login fehlgeschlagen");
        return;
    }

    mobileUser = data;

    localStorage.setItem(
        "taxiMobileUser",
        JSON.stringify(data)
    );

    mobileStart();
}

function mobileLogout() {
    localStorage.removeItem("taxiMobileUser");
    location.reload();
}

async function mobileStart() {
    const saved =
    localStorage.getItem("taxiMobileUser");

    if (!saved) {
        return;
    }

    mobileUser = JSON.parse(saved);

    document.getElementById("mobileLoginBox").style.display = "none";
    document.getElementById("mobileAppBox").style.display = "block";

    document.getElementById("mobileCurrentUser").innerText =
    mobileUser.display_name;

    await mobileLoadAll();
    mobileSetupRealtime();
}

function setMobileMode(mode) {
    mobileMode = mode;

    document.getElementById("driverModeBox").style.display =
    mode === "driver" ? "block" : "none";

    document.getElementById("dispatcherModeBox").style.display =
    mode === "dispatcher" ? "block" : "none";

    document.getElementById("tabDriverBtn").classList.toggle(
        "active",
        mode === "driver"
    );

    document.getElementById("tabDispatcherBtn").classList.toggle(
        "active",
        mode === "dispatcher"
    );

    mobileRenderDispatchers();
}

async function mobileLoadAll() {
    await mobileLoadDriverStatus();
    await mobileLoadDispatchers();
    await mobileLoadOpenJobs();
    await mobileLoadMyJobs();
}

function mobileSetupRealtime() {
    if (mobileRealtimeStarted) {
        return;
    }

    mobileRealtimeStarted = true;

    client
    .channel("taxi-mobile-live")
    .on(
        "postgres_changes",
        {
            event: "*",
            schema: "public",
            table: "taxi_jobs"
        },
        () => {
            mobileLoadOpenJobs();
            mobileLoadMyJobs();
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
            mobileLoadDriverStatus();
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
            mobileLoadDispatchers();
        }
    )
    .subscribe();
}

async function mobileLoadDriverStatus() {
    const { data, error } =
    await client
    .from("taxi_driver_status")
    .select("*")
    .order("display_name", {
        ascending: true
    });

    if (error) {
        console.error(error);
        return;
    }

    const own =
    (data || []).find(
        driver => driver.username === mobileUser.username
    );

    mobileCurrentStatus =
    own ? own.status : "Offline";

    let badge = "🔴 Offline";

    if (mobileCurrentStatus === "Im Dienst") {
        badge = "🟢 Im Dienst";
    }

    if (mobileCurrentStatus === "Pause") {
        badge = "🟡 Pause";
    }

    document.getElementById("mobile_driver_status").innerHTML = `
        <div class="status-badge">
            ${badge}
        </div>
    `;

    const active =
    (data || []).filter(
        driver => driver.status === "Im Dienst"
    );

    const paused =
    (data || []).filter(
        driver => driver.status === "Pause"
    );

    let html = "";

    if (active.length > 0) {
        html += "<strong>Im Dienst:</strong><br>";
        active.forEach(driver => {
            html += `🟢 ${escapeHtml(driver.display_name)}<br>`;
        });
    }

    if (paused.length > 0) {
        html += "<br><strong>Pause:</strong><br>";
        paused.forEach(driver => {
            html += `🟡 ${escapeHtml(driver.display_name)}<br>`;
        });
    }

    document.getElementById("mobile_active_drivers").innerHTML =
    html || "Keine Fahrer im Dienst.";
}

async function mobileSetDriverStatus(status) {
    if (
        status === "Offline" &&
        mobileIsDispatcher()
    ) {
        await mobileLeaveDispatcher();
    }

    const { error } =
    await client
    .from("taxi_driver_status")
    .upsert({
        username: mobileUser.username,
        display_name: mobileUser.display_name,
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
        username: mobileUser.username,
        display_name: mobileUser.display_name,
        old_status: mobileCurrentStatus,
        new_status: status
    }]);

    mobileCurrentStatus = status;

    await mobileLoadAll();
}

async function mobileLoadDispatchers() {
    const { data, error } =
    await client
    .from("taxi_dispatchers")
    .select("*")
    .eq("active", true)
    .order("started_at", {
        ascending: true
    });

    if (error) {
        console.error(error);
        return;
    }

    mobileDispatchers = data || [];

    mobileRenderDispatchers();
}

function mobileIsDispatcher() {
    return mobileDispatchers.some(
        dispatcher => dispatcher.username === mobileUser.username
    );
}

function mobileCanTakeDispatcher() {
    return (
        mobileCurrentStatus === "Im Dienst" ||
        mobileCurrentStatus === "Pause"
    );
}

function mobileRenderDispatchers() {
    const box =
    document.getElementById("mobile_dispatcher_status");

    const btn =
    document.getElementById("mobileDispatcherBtn");

    const createBox =
    document.getElementById("mobileCreateJobBox");

    if (!box || !btn || !createBox) {
        return;
    }

    let html = "";

    if (mobileDispatchers.length === 0) {
        html = "Keine Leitstelle aktiv.";
    } else {
        mobileDispatchers.forEach((dispatcher, index) => {
            html += `${index + 1}. ${escapeHtml(dispatcher.display_name)}<br>`;
        });
    }

    html += `<br><small>${mobileDispatchers.length}/2 Plätze belegt</small>`;

    box.innerHTML = html;

    if (mobileIsDispatcher()) {
        btn.innerText = "❌ Leitstelle verlassen";
        btn.classList.add("danger-btn");
        createBox.style.display = "block";
    } else {
        btn.innerText = "📡 Leitstelle übernehmen";
        btn.classList.remove("danger-btn");
        createBox.style.display = "none";
    }

    if (
        !mobileCanTakeDispatcher() &&
        !mobileIsDispatcher()
    ) {
        btn.style.display = "none";
    } else {
        btn.style.display = "inline-block";
    }
}

async function mobileToggleDispatcher() {
    if (mobileIsDispatcher()) {
        await mobileLeaveDispatcher();
    } else {
        await mobileTakeDispatcher();
    }
}

async function mobileTakeDispatcher() {
    await mobileLoadDriverStatus();
    await mobileLoadDispatchers();

    if (!mobileCanTakeDispatcher()) {
        alert("Du musst auf Dienst oder Pause stehen.");
        return;
    }

    if (mobileDispatchers.length >= 2) {
        alert("Es sind bereits 2 Leitstellen aktiv.");
        return;
    }

    const { error } =
    await client
    .from("taxi_dispatchers")
    .insert([{
        username: mobileUser.username,
        display_name: mobileUser.display_name,
        active: true
    }]);

    if (error) {
        alert("Leitstelle konnte nicht übernommen werden.");
        console.error(error);
        return;
    }

    await mobileLoadDispatchers();
}

async function mobileLeaveDispatcher() {
    const { error } =
    await client
    .from("taxi_dispatchers")
    .update({
        active: false
    })
    .eq("username", mobileUser.username)
    .eq("active", true);

    if (error) {
        alert("Leitstelle konnte nicht verlassen werden.");
        console.error(error);
        return;
    }

    await mobileLoadDispatchers();
}

async function mobileCreateJob() {
    if (!mobileIsDispatcher()) {
        alert("Du musst zuerst die Leitstelle übernehmen.");
        return;
    }

    const ride_type =
    document.getElementById("mobile_job_ride_type").value;

    const pickup_location =
    document.getElementById("mobile_job_pickup_location").value.trim();

    const destination =
    document.getElementById("mobile_job_destination").value.trim();

    const customer_name =
    document.getElementById("mobile_job_customer_name").value.trim();

    const notes =
    document.getElementById("mobile_job_notes").value.trim();

    if (!pickup_location) {
        alert("Bitte Abholort eintragen.");
        return;
    }

    const { error } =
    await client
    .from("taxi_jobs")
    .insert([{
        created_by: mobileUser.display_name,
        job_status: "Offen",
        ride_type: ride_type,
        pickup_location: pickup_location,
        destination: destination,
        customer_name: customer_name,
        notes: notes
    }]);

    if (error) {
        alert("Auftrag konnte nicht erstellt werden.");
        console.error(error);
        return;
    }

    document.getElementById("mobile_job_pickup_location").value = "";
    document.getElementById("mobile_job_destination").value = "";
    document.getElementById("mobile_job_customer_name").value = "";
    document.getElementById("mobile_job_notes").value = "";

    await mobileLoadAll();
}

async function mobileLoadOpenJobs() {
    const box =
    document.getElementById("mobile_open_jobs");

    const { data, error } =
    await client
    .from("taxi_jobs")
    .select("*")
    .eq("job_status", "Offen")
    .order("created_at", {
        ascending: false
    });

    if (error) {
        console.error(error);
        box.innerHTML = "Fehler beim Laden.";
        return;
    }
    const currentIds =
(data || []).map(job => job.id);

const newJobs =
(data || []).filter(
    job => !lastKnownOpenJobIds.includes(job.id)
);

if (lastKnownOpenJobIds.length > 0) {

    newJobs.forEach(job => {

        showMobileToast(
            `📞 Neuer Auftrag: ${job.pickup_location || "Unbekannt"}`
        );

        playNewJobSound();
    });
}

lastKnownOpenJobIds = currentIds;
    if (!data || data.length === 0) {
        box.innerHTML = "Keine offenen Fahrten.";
        return;
    }

    box.innerHTML =
    data.map(job => `
        <div class="mobile-job-card">
            <div class="mobile-job-top">
                <strong>${escapeHtml(job.ride_type || "-")}</strong>
                <span>Offen</span>
            </div>

            <div class="mobile-route">
                <div>
                    <small>Abholung</small>
                    <b>${escapeHtml(job.pickup_location || "-")}</b>
                </div>

                <div>→</div>

                <div>
                    <small>Ziel</small>
                    <b>${escapeHtml(job.destination || "-")}</b>
                </div>
            </div>

            <div class="mobile-job-info">
                👤 ${escapeHtml(job.customer_name || "-")}<br>
                📝 ${escapeHtml(job.notes || "-")}
            </div>

            <button onclick="mobileTakeJob('${job.id}')">
                🚕 Übernehmen
            </button>
        </div>
    `).join("");
}

async function mobileTakeJob(jobId) {
    const { error } =
    await client
    .from("taxi_jobs")
    .update({
        job_status: "Übernommen",
        assigned_driver: mobileUser.display_name,
        assigned_at: new Date().toISOString()
    })
    .eq("id", jobId)
    .eq("job_status", "Offen");

    if (error) {
        alert("Auftrag konnte nicht übernommen werden.");
        console.error(error);
        return;
    }

    await mobileSetDriverStatus("Im Dienst");
    await mobileLoadAll();
}

async function mobileLoadMyJobs() {
    const box =
    document.getElementById("mobile_my_jobs");

    const { data, error } =
    await client
    .from("taxi_jobs")
    .select("*")
    .eq("job_status", "Übernommen")
    .eq("assigned_driver", mobileUser.display_name)
    .order("assigned_at", {
        ascending: false
    });

    if (error) {
        console.error(error);
        box.innerHTML = "Fehler beim Laden.";
        return;
    }

    if (!data || data.length === 0) {
        box.innerHTML = "Keine eigene Fahrt.";
        return;
    }

    box.innerHTML =
    data.map(job => `
        <div class="mobile-job-card">
            <div class="mobile-job-top">
                <strong>${escapeHtml(job.ride_type || "-")}</strong>
                <span>Übernommen</span>
            </div>

            <div class="mobile-route">
                <div>
                    <small>Abholung</small>
                    <b>${escapeHtml(job.pickup_location || "-")}</b>
                </div>

                <div>→</div>

                <div>
                    <small>Ziel</small>
                    <b>${escapeHtml(job.destination || "-")}</b>
                </div>
            </div>

            <div class="field">
                <label>Ziel</label>
                <input id="mobile_destination_${job.id}" value="${escapeAttr(job.destination || "")}">
            </div>

            <div class="field">
                <label>Kunde</label>
                <input id="mobile_customer_${job.id}" value="${escapeAttr(job.customer_name || "")}">
            </div>

            <div class="field">
                <label>Kilometer</label>
                <input type="number" id="mobile_km_${job.id}" value="0">
            </div>

            <div class="field">
                <label>Ausgestellte Rechnung</label>
                <input type="number" id="mobile_invoice_${job.id}" value="0">
            </div>

            <div class="field">
                <label>Bemerkung</label>
                <input id="mobile_notes_${job.id}" value="${escapeAttr(job.notes || "")}">
            </div>

            <div class="mobile-button-grid">
                <button onclick="mobileCompleteJob('${job.id}', '${escapeAttr(job.ride_type || "")}')">
                    ✅ Erledigt
                </button>

                <button class="danger-btn" onclick="mobileReleaseJob('${job.id}')">
                    ↩️ Freigeben
                </button>
            </div>
        </div>
    `).join("");
}

async function mobileCompleteJob(jobId, rideType) {
    const kilometers =
    Number(document.getElementById(`mobile_km_${jobId}`).value || 0);

    const invoice_amount =
    Number(document.getElementById(`mobile_invoice_${jobId}`).value || 0);

    const destination =
    document.getElementById(`mobile_destination_${jobId}`).value.trim();

    const customer =
    document.getElementById(`mobile_customer_${jobId}`).value.trim();

    const notes =
    document.getElementById(`mobile_notes_${jobId}`).value.trim();

    if (!destination) {
        alert("Bitte Ziel eintragen.");
        return;
    }

    let fare_amount = kilometers * 5;
    let tip_amount = invoice_amount - fare_amount;
    let billed_to = "Kunde";

    if (rideType === "Bambi-Tour") {
        fare_amount = 0;
        tip_amount = invoice_amount;
        billed_to = "Kostenlos";
    }

    if (rideType === "EMS") {
        tip_amount = invoice_amount;
        billed_to = "EMS";
    }

    if (rideType === "Gebrauchtwagenhändler") {
        tip_amount = invoice_amount;
        billed_to = "Gebrauchtwagenhändler";
    }

    const { error } =
    await client
    .from("taxi_jobs")
    .update({
        job_status: "Erledigt",
        completed_at: new Date().toISOString(),
        customer_name: customer,
        destination: destination,
        kilometers: kilometers,
        fare_amount: fare_amount,
        invoice_amount: invoice_amount,
        tip_amount: tip_amount,
        billed_to: billed_to,
        notes: notes
    })
    .eq("id", jobId);

    if (error) {
        alert("Fahrt konnte nicht abgeschlossen werden.");
        console.error(error);
        return;
    }

    await mobileLoadAll();
}

async function mobileReleaseJob(jobId) {
    const ok =
    confirm("Auftrag wieder freigeben?");

    if (!ok) {
        return;
    }

    const { error } =
    await client
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

    await mobileLoadAll();
}
function showMobileToast(text) {

    const container =
    document.getElementById("toastContainer");

    const toast =
    document.createElement("div");

    toast.className = "mobile-toast";
    toast.innerText = text;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("show");
    }, 50);

    setTimeout(() => {

        toast.classList.remove("show");

        setTimeout(() => {
            toast.remove();
        }, 300);

    }, 4000);
}

function playNewJobSound() {

    const audio =
    new Audio(
        "https://cdn.freesound.org/previews/242/242501_4284968-lq.mp3"
    );

    audio.volume = 0.35;

    audio.play().catch(() => {});
}
