let guideTaxiAvailable = false;
let guideCurrentJobId = null;
let guideJobChannel = null;
let bambiToursEnabled = true;

window.addEventListener("load", async () => {
    await loadGuideTaxiStatus();

    const savedJobId = localStorage.getItem("guideCurrentJobId");

    if (savedJobId) {
        guideCurrentJobId = savedJobId;
        await loadGuideJob(savedJobId);
        subscribeGuideJob(savedJobId);
    }
});

async function loadGuideTaxiStatus() {
    const box = document.getElementById("guide_taxi_status");

    bambiToursEnabled = await getBambiToursEnabled();

    if (!bambiToursEnabled) {
        guideTaxiAvailable = false;

        box.innerHTML = `
            <strong>🔴 Bambi-Touren deaktiviert</strong><br>
            Die Taxi-Leitstelle nimmt aktuell keine Bambi-Touren an.
        `;

        return;
    }

    const { data: dispatchers } = await client
        .from("taxi_dispatchers")
        .select("*")
        .eq("active", true);

    const { data: drivers } = await client
        .from("taxi_driver_status")
        .select("*")
        .in("status", ["Im Dienst", "Pause"]);

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

    await loadGuideTaxiStatus();

    if (!bambiToursEnabled) {
        result.innerHTML = `
            <div class="admin-card">
                ❌ Aktuell werden keine Bambi-Touren angenommen.
            </div>
        `;
        return;
    }

    if (!playerName) {
        result.innerHTML = `
            <div class="admin-card">
                ❌ Bitte Vor- und Nachname eintragen.
            </div>
        `;
        return;
    }

    const { data, error } = await client
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
        }])
        .select()
        .single();

    if (error || !data) {
        console.error(error);

        result.innerHTML = `
            <div class="admin-card">
                ❌ Auftrag konnte nicht gesendet werden.
            </div>
        `;

        return;
    }

    guideCurrentJobId = data.id;
    localStorage.setItem("guideCurrentJobId", data.id);

    nameInput.value = "";

    renderGuideJobStatus(data);
    subscribeGuideJob(data.id);

    await loadGuideTaxiStatus();
}

async function loadGuideJob(jobId) {
    const { data, error } = await client
        .from("taxi_jobs")
        .select("*")
        .eq("id", jobId)
        .single();

    if (error || !data) {
        localStorage.removeItem("guideCurrentJobId");
        return;
    }

    renderGuideJobStatus(data);

    if (
        data.job_status === "Erledigt" ||
        data.job_status === "Nicht angetroffen"
    ) {
        localStorage.removeItem("guideCurrentJobId");
    }
}

function renderGuideJobStatus(job) {
    const result = document.getElementById("guide_result");

    let statusIcon = "📞";
    let statusText = "Offen";
    let driverLine = "Noch kein Fahrer zugewiesen.";

    if (job.job_status === "Übernommen") {
        statusIcon = "🚕";
        statusText = "Taxi ist unterwegs";
        driverLine = `Fahrer: <strong>${escapeHtml(job.assigned_driver || "-")}</strong>`;
    }

    if (job.job_status === "Erledigt") {
        statusIcon = "✅";
        statusText = "Fahrt erledigt";
        driverLine = `Fahrer: <strong>${escapeHtml(job.assigned_driver || "-")}</strong>`;
    }

    if (job.job_status === "Nicht angetroffen") {
        statusIcon = "❌";
        statusText = "Fahrgast nicht angetroffen";
        driverLine = `Fahrer: <strong>${escapeHtml(job.assigned_driver || "-")}</strong>`;
    }

    result.innerHTML = `
        <div class="admin-card">
            <h3>${statusIcon} ${statusText}</h3>

            <p>
                <strong>Spieler:</strong> ${escapeHtml(job.customer_name || "-")}<br>
                <strong>Abholung:</strong> ${escapeHtml(job.pickup_location || "-")}<br>
                ${driverLine}
            </p>

            <small>
                Diese Anzeige aktualisiert sich automatisch.
            </small>
        </div>
    `;
}

function subscribeGuideJob(jobId) {
    if (guideJobChannel) {
        client.removeChannel(guideJobChannel);
    }

    guideJobChannel = client
        .channel(`guide-bambi-job-${jobId}`)
        .on(
            "postgres_changes",
            {
                event: "UPDATE",
                schema: "public",
                table: "taxi_jobs",
                filter: `id=eq.${jobId}`
            },
            payload => {
                renderGuideJobStatus(payload.new);

                if (
                    payload.new.job_status === "Erledigt" ||
                    payload.new.job_status === "Nicht angetroffen"
                ) {
                    localStorage.removeItem("guideCurrentJobId");
                }
            }
        )
        .subscribe();
}
