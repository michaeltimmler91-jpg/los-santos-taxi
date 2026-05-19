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
    const userRaw = localStorage.getItem("taxiUser");
    const user = userRaw ? JSON.parse(userRaw) : null;

    const { error } = await window.client
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
    if (!window.client) return;

    window.client
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
