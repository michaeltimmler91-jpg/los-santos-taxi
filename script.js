const SUPABASE_URL = "https://unkfqoplynwabulnzpar.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_AkIVrLBsgIV2jYJ5gGsBmw_f7P62KTK";

const client = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

let currentUser = null;
let companies = [];
let activeDispatchers = [];
let realtimeStarted = false;

/* =========================
   LOGIN
========================= */

async function loginUser() {

    const username =
        document.getElementById(
            "login_username"
        ).value.trim();

    const password =
        document.getElementById(
            "login_password"
        ).value.trim();

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

    localStorage.setItem(
        "taxiUser",
        JSON.stringify(data)
    );

    startApp();
}

function logoutUser() {
    localStorage.removeItem("taxiUser");
    location.reload();
}

/* =========================
   START
========================= */

async function startApp() {

    const savedUser =
        localStorage.getItem("taxiUser");

    if (!savedUser) return;

    currentUser = JSON.parse(savedUser);

    document.getElementById(
        "loginBox"
    ).style.display = "none";

    document.getElementById(
        "appBox"
    ).style.display = "block";

    document.getElementById(
        "currentUserName"
    ).innerText = currentUser.display_name;

    document.getElementById(
        "currentUserRole"
    ).innerText = currentUser.role;

    if (currentUser.role === "admin") {

        document.getElementById(
            "adminLink"
        ).style.display = "inline-block";
    }

    await loadDispatchers();

    loadDriverStatus();

    await loadCompanies();

    updateJobForm();

    await loadJobs();

    setupRealtime();

    loadSoundSettings();

    startIdleWatcher();
}

/* =========================
   REALTIME
========================= */

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

/* =========================
   DISPATCH
========================= */

function isActiveDispatcher() {

    return activeDispatchers.some(
        d => d.username === currentUser.username
    );
}

async function loadDispatchers() {

    const { data, error } = await client
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

    activeDispatchers = data || [];

    renderDispatchers();
}

function renderDispatchers() {

    const box =
        document.getElementById(
            "dispatcher_status"
        );

    const createBox =
        document.getElementById(
            "createJobBox"
        );

    const btn =
        document.getElementById(
            "dispatcherToggleBtn"
        );

    let html = "";

    if (activeDispatchers.length === 0) {

        html += "Keine Leitstelle aktiv.";
    }
    else {

        activeDispatchers.forEach(
            (dispatcher, index) => {

                html += `
                    ${index + 1}.
                    ${escapeHtml(dispatcher.display_name)}
                    <br>
                `;
            }
        );
    }

    html += `
        <br>
        <small>
            ${activeDispatchers.length}/2 Plätze belegt
        </small>
    `;

    box.innerHTML = html;

    if (isActiveDispatcher()) {

        btn.innerText =
            "❌ Leitstelle verlassen";

        btn.classList.add("danger-btn");

        createBox.style.display = "block";
    }
    else {

        btn.innerText =
            "📡 Leitstelle übernehmen";

        btn.classList.remove("danger-btn");

        createBox.style.display = "none";
    }
}

async function toggleDispatcherStatus() {

    if (isActiveDispatcher()) {

        await leaveDispatcher();
    }
    else {

        await takeDispatcher();
    }
}

async function takeDispatcher() {

    const ownStatus =
        document.getElementById(
            "driver_status_text"
        ).innerText;

    if (
        !ownStatus.includes("Im Dienst") &&
        !ownStatus.includes("Pause")
    ) {
        alert(
            "Du musst zuerst im Dienst oder Pause sein."
        );
        return;
    }

    await loadDispatchers();

    if (isActiveDispatcher()) {
        alert("Du bist bereits Leitstelle.");
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

    loadDispatchers();
}

async function leaveDispatcher() {

    const { error } = await client
        .from("taxi_dispatchers")
        .update({
            active: false
        })
        .eq("username", currentUser.username)
        .eq("active", true);

    if (error) {
        alert("Leitstelle konnte nicht verlassen werden.");
        console.error(error);
        return;
    }

    loadDispatchers();
}

/* =========================
   DRIVER STATUS
========================= */

async function setDriverStatus(status) {

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

    if (
        status === "Offline" &&
        isActiveDispatcher()
    ) {
        await leaveDispatcher();
    }

    loadDriverStatus();
}

async function loadDriverStatus() {

    const { data, error } = await client
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
        data.find(
            d => d.username === currentUser.username
        );

    const text =
        document.getElementById(
            "driver_status_text"
        );

    if (text) {

        text.innerText =
            `Status: ${own ? own.status : "Offline"}`;
    }

    const activeBox =
        document.getElementById(
            "active_drivers_list"
        );

    const dispatcherBtn =
        document.getElementById(
            "dispatcherToggleBtn"
        );

    if (
        own &&
        (
            own.status === "Im Dienst" ||
            own.status === "Pause"
        )
    ) {
        dispatcherBtn.style.display = "block";
    }
    else {
        dispatcherBtn.style.display = "none";
    }

    const activeDrivers =
        data.filter(
            d => d.status === "Im Dienst"
        );

    const pausedDrivers =
        data.filter(
            d => d.status === "Pause"
        );

    let html = "";

    if (activeDrivers.length > 0) {

        html += `
            <br>
            <strong>Im Dienst:</strong>
            <br>
        `;

        activeDrivers.forEach(driver => {

            html += `
                🟢
                ${escapeHtml(driver.display_name)}
                <br>
            `;
        });
    }

    if (pausedDrivers.length > 0) {

        html += `
            <br>
            <strong>Pause:</strong>
            <br>
        `;

        pausedDrivers.forEach(driver => {

            html += `
                🟡
                ${escapeHtml(driver.display_name)}
                <br>
            `;
        });
    }

    activeBox.innerHTML =
        html || "<br>Keine Fahrer im Dienst.";
}
