function getDbClient() {
    if (typeof client !== "undefined") return client;
    if (typeof supabaseClient !== "undefined") return supabaseClient;
    if (window.client) return window.client;
    if (window.supabaseClient) return window.supabaseClient;

    console.error("Kein Supabase Client gefunden.");
    return null;
}

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

    setTimeout(() => {
        crash.style.display = "none";
    }, 3500);
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
    if (type === "clean") runCleanEgg();
    if (type === "fire") runFireEgg();
    if (type === "superdisco") runSuperDiscoEgg();
    if (type === "ufo") runUfoEgg();
    if (type === "discoextrem") runDiscoExtremEgg();
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
function runCleanEgg() {
    const clean = document.getElementById("cleanEgg");
    if (!clean) return;

    clean.classList.remove("active");
    void clean.offsetWidth;
    clean.classList.add("active");

    setTimeout(() => {
        clean.classList.remove("active");
    }, 5500);
}

function runFireEgg() {
    const fire = document.getElementById("fireEgg");
    if (!fire) return;

    fire.classList.add("active");

    setTimeout(() => {
        fire.classList.remove("active");
    }, 5000);
}

function runSuperDiscoEgg() {
    document.body.classList.add("super-disco-mode");

    setTimeout(() => {
        document.body.classList.remove("super-disco-mode");
    }, 6000);
}

function runUfoEgg() {
    const ufo = document.getElementById("ufoEgg");
    if (!ufo) return;

    ufo.classList.remove("active");
    document.body.classList.remove("ufo-abduct-body");

    void ufo.offsetWidth;

    ufo.classList.add("active");
    document.body.classList.add("ufo-abduct-body");

    setTimeout(() => {
        ufo.classList.remove("active");
        document.body.classList.remove("ufo-abduct-body");
    }, 6500);
}
function runDiscoExtremEgg() {

    document.body.classList.add(
        "super-disco-mode"
    );

    const sayings = [

        "🪩 DISCO EXTREM AKTIVIERT",

        "🚕 LENNOX DREHT KOMPLETT DURCH",

        "💃 ALLE FAHRER TANZEN JETZT",

        "🌈 CHAOSLEVEL KRITISCH",

        "🎶 TAXI FM ESKALIERT",

        "🕺 LEITSTELLE IM PARTYMODUS",

        "🔥 DISPATCH SYSTEM ÜBERHITZT"

    ];

    const randomText =
    sayings[
        Math.floor(
            Math.random() * sayings.length
        )
    ];

    const overlay =
    document.createElement("div");

    overlay.className =
    "disco-extrem-overlay";

    overlay.innerHTML = `

        <div class="disco-extrem-box">

            <div class="disco-extrem-title">

                ${randomText}

            </div>

            <div class="disco-extrem-emojis">

                🚕 🪩 🌈 💃 🕺 🎶 🔥

            </div>

        </div>
    `;

    document.body.appendChild(
        overlay
    );

    const emojiRain =
    setInterval(() => {

        const emoji =
        document.createElement("div");

        emoji.className =
        "disco-extrem-rain";

        const emojis = [
            "🪩",
            "🚕",
            "🌈",
            "💃",
            "🕺",
            "🔥",
            "🎶"
        ];

        emoji.innerText =
        emojis[
            Math.floor(
                Math.random() * emojis.length
            )
        ];

        emoji.style.left =
        Math.random() * 100 + "vw";

        emoji.style.fontSize =
        (20 + Math.random() * 40) + "px";

        emoji.style.animationDuration =
        (2 + Math.random() * 3) + "s";

        document.body.appendChild(
            emoji
        );

        setTimeout(() => {
            emoji.remove();
        }, 6000);

    }, 120);

    setTimeout(() => {

        clearInterval(
            emojiRain
        );

        document.body.classList.remove(
            "super-disco-mode"
        );

        overlay.remove();

    }, 10000);
}
