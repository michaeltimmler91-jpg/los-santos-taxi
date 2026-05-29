let guideTaxiAvailable = false;

window.addEventListener("load", () => {
    loadGuideTaxiStatus();
});

async function loadGuideTaxiStatus() {

    const box = document.getElementById("guide_taxi_status");

    const { data: dispatchers, error: dispatcherError } = await client
        .from("taxi_dispatchers")
        .select("*")
        .eq("active", true);

    if (dispatcherError) {
        console.error(dispatcherError);
        box.innerHTML = "❌ Status konnte nicht geladen werden.";
        return;
    }

    const { data: drivers, error: driverError } = await client
        .from("taxi_driver_status")
        .select("*")
        .in("status", ["Im Dienst", "Pause"]);

    if (driverError) {
        console.error(driverError);
        box.innerHTML = "❌ Fahrerstatus konnte nicht geladen werden.";
        return;
    }

    guideTaxiAvailable =
        (dispatchers && dispatchers.length > 0) ||
        (drivers && drivers.length > 0);

    if (guideTaxiAvailable) {
        box.innerHTML = `
            <strong>🟢 Taxi erreichbar</strong><br>
            Es ist aktuell eine Leitstelle oder ein Fahrer verfügbar.
        `;
    } else {
        box.innerHTML = `
            <strong>🔴 Aktuell kein Taxi verfügbar</strong><br>
            Bitte nur absenden, wenn es wirklich wichtig ist.
        `;
    }
}

async function createGuideBambiJob() {

    const nameInput = document.getElementById("guide_player_name");
    const result = document.getElementById("guide_result");

    const playerName = nameInput.value.trim();

    if (!playerName) {
        result.innerHTML = `
            <div class="admin-card">
                ❌ Bitte Vor- und Nachname eintragen.
            </div>
        `;
        return;
    }

    const { error } = await client
        .from("taxi_jobs")
        .insert([{
            created_by: "Guide",
            job_status: "Offen",
            ride_type: "Bambi-Tour",
            pickup_location: "Einreise / Flughafen",
            destination: "",
            customer_name: playerName,
            company_name: null,
            ems_staff_name: null,
            notes: "Bambi-Tour wurde durch einen Guide angefragt."
        }]);

    if (error) {
        console.error(error);

        result.innerHTML = `
            <div class="admin-card">
                ❌ Auftrag konnte nicht gesendet werden.
            </div>
        `;

        return;
    }

    nameInput.value = "";

    result.innerHTML = `
        <div class="admin-card">
            ✅ Bambi-Tour wurde an die Taxi-Leitstelle gesendet.
        </div>
    `;

    await loadGuideTaxiStatus();
}
