function runTaxiEgg() {

    alert("🚕 Taxi Easter Egg!");

}

function runCrashEgg() {

    alert("💥 Leitstelle abgestürzt!");

}

function runDiscoEgg() {

    document.body.style.animation =
        "discoFlash 0.3s infinite";

    setTimeout(() => {

        document.body.style.animation = "";

    }, 5000);
}
async function triggerGlobalEasterEgg(type) {

    const userRaw = localStorage.getItem("taxiUser");
    const user = userRaw ? JSON.parse(userRaw) : null;

    const { error } = await client
        .from("taxi_easter_events")
        .insert([{
            event_type: type,
            created_by: user ? user.display_name : "Unbekannt"
        }]);

    if (error) {
        console.error(error);
    }
}

function runEasterEggByType(type) {

    if (type === "taxi") {
        runTaxiEgg();
    }

    if (type === "crash") {
        runCrashEgg();
    }

    if (type === "disco") {
        runDiscoEgg();
    }
}

function setupGlobalEasterEggs() {

    client
        .channel("taxi-easter-eggs")
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "taxi_easter_events"
            },
            payload => {

                runEasterEggByType(
                    payload.new.event_type
                );
            }
        )
        .subscribe();
}
