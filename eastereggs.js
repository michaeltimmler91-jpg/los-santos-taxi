function getDbClient() {
    if (typeof client !== "undefined") return client;
    if (typeof supabaseClient !== "undefined") return supabaseClient;
    if (window.client) return window.client;
    if (window.supabaseClient) return window.supabaseClient;

    console.error("Kein Supabase Client gefunden.");
    return null;
}

function runTaxiEgg() {
    alert("🚕 Taxi Easter Egg!");
}

function runCrashEgg() {
    alert("💥 Leitstelle abgestürzt!");
}

function runDiscoEgg() {
    document.body.classList.add("disco-mode");

    setTimeout(() => {
        document.body.classList.remove("disco-mode");
    }, 5000);
}

function runEasterEggByType(type) {
    if (type === "taxi") runTaxiEgg();
    if (type === "crash") runCrashEgg();
    if (type === "disco") runDiscoEgg();
}

async function triggerGlobalEasterEgg(type) {
    const db = getDbClient();

    if (!db) {
        alert("Supabase Client nicht gefunden.");
        return;
    }

    const userRaw = localStorage.getItem("taxiUser");
    const user = userRaw ? JSON.parse(userRaw) : null;

    const { error } = await db
        .from("taxi_easter_events")
        .insert([{
            event_type: type,
            created_by: user ? user.display_name : "Unbekannt"
        }]);

    if (error) {
        console.error(error);
        alert("Easter Egg konnte nicht ausgelöst werden.");
    }
}

function setupGlobalEasterEggs() {
    const db = getDbClient();

    if (!db) {
        console.error("Realtime konnte nicht gestartet werden.");
        return;
    }

    db
        .channel("taxi-easter-eggs")
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "taxi_easter_events"
            },
            payload => {
                runEasterEggByType(payload.new.event_type);
            }
        )
        .subscribe();
}
