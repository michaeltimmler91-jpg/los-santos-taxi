function runTaxiEgg() {
    const taxi = document.getElementById("taxiEgg");
    if (!taxi) return;

    taxi.classList.remove("drive");
    void taxi.offsetWidth;
    taxi.classList.add("drive");

    setTimeout(() => {
        taxi.classList.remove("drive");
    }, 5500);
}

function runCrashEgg() {
    const crash = document.getElementById("crashEgg");
    if (!crash) return;

    crash.style.display = "flex";
    document.body.style.overflow = "hidden";

    setTimeout(() => {
        crash.style.display = "none";
        document.body.style.overflow = "";
    }, 3500);
}

function runDiscoEgg() {
    document.body.classList.add("disco-mode");

    setTimeout(() => {
        document.body.classList.remove("disco-mode");
    }, 5000);
}

function startEasterEggs() {
    setInterval(() => {
        const chance = Math.random();

        if (chance < 0.10) {
            runTaxiEgg();
        }
        else if (chance < 0.16) {
            runCrashEgg();
        }
        else if (chance < 0.22) {
            runDiscoEgg();
        }
    }, 5 * 60 * 1000);
}
