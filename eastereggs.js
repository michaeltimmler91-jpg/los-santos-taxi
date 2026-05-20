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

function runDiscoExtremEgg(song = null) {

    document.body.classList.add(
        "super-disco-mode",
        "disco-screen-shake"
    );

    const discoSongs = [
        "eastereggsound/2-unlimited-get-ready-for-this.mp3",
        "eastereggsound/crazy-chicken-klingelton.mp3",
        "eastereggsound/crazy-frog-remix.mp3",
        "eastereggsound/daft-punk.mp3",
        "eastereggsound/danza-kuduro.mp3",
        "eastereggsound/die-tasse-kaffee.mp3",
        "eastereggsound/dota-basshunter.mp3",
        "eastereggsound/hardcore-peniz-effect.mp3",
        "eastereggsound/mobelstuck.mp3",
        "eastereggsound/musica-barbie.mp3",
        "eastereggsound/smells-like-teen-spirit.mp3",
        "eastereggsound/tell-me-why-long.mp3",
        "eastereggsound/vengaboys-boom-boom-boom-boom.mp3"
    ];

    const randomSong =
song ||
discoSongs[
    Math.floor(Math.random() * discoSongs.length)
];

    const discoAudio =
    new Audio(randomSong);

    discoAudio.volume = 0.45;

    const sayings = [
        "🪩 DISCO EXTREM AKTIVIERT",
        "🚕 LENNOX HAT DIE LEITSTELLE VERLOREN",
        "💃 ALLE FAHRER TANZEN JETZT",
        "🌈 CHAOSLEVEL: AMTLICH BEDENKLICH",
        "🎶 TAXI FM SENDET ILLEGAL",
        "🕺 LEITSTELLE IM TOTALABSTURZ",
        "🔥 DISPATCH SYSTEM BRENNT",
        "🚨 TANZPFLICHT FÜR ALLE EINHEITEN",
        "⚠️ DIE LEITSTELLE IST JETZT EIN CLUB",
        "💥 SYSTEM SAGT: NEIN. LENNOX SAGT: DOCH."
    ];

    const randomText =
    sayings[
        Math.floor(Math.random() * sayings.length)
    ];

    const overlay =
    document.createElement("div");

    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100vw";
    overlay.style.height = "100vh";
    overlay.style.zIndex = "999999999";
    overlay.style.pointerEvents = "none";
    overlay.style.overflow = "hidden";

    overlay.innerHTML = `

        <div style="
            position:fixed;
            top:50%;
            left:50%;
            transform:translate(-50%, -50%);
            min-width:700px;
            min-height:260px;
            padding:40px 60px;
            background:rgba(0,0,0,0.92);
            border:5px solid white;
            border-radius:30px;
            box-shadow:
                0 0 30px #ff00ff,
                0 0 70px #00ffff,
                0 0 120px #ffff00;
            display:flex;
            flex-direction:column;
            align-items:center;
            justify-content:center;
            text-align:center;
            color:white;
        ">

            <div style="
                font-size:52px;
                font-weight:900;
                text-shadow:
                    0 0 10px #ff00ff,
                    0 0 25px #00ffff,
                    0 0 45px #ffff00;
                margin-bottom:20px;
            ">
                ${randomText}
            </div>

            <div style="
                font-size:24px;
                font-weight:800;
                color:#ffe600;
                margin-bottom:20px;
            ">
                🚕 LEITSTELLE NICHT MEHR ZUSTÄNDIG 🚕
            </div>

            <div style="
                font-size:42px;
                margin-bottom:20px;
            ">
                🚕 🪩 🌈 💃 🕺 🎶 🔥 🚨 💥
            </div>

            <div style="
                font-size:22px;
                font-weight:900;
                color:#00ffff;
                letter-spacing:4px;
            ">
                BASS BOOST AKTIV
            </div>

        </div>
    `;

    document.documentElement.appendChild(overlay);

    const emojis = [
        "🪩",
        "🚕",
        "🌈",
        "💃",
        "🕺",
        "🔥",
        "🎶",
        "🚨",
        "💥",
        "✨",
        "🧨",
        "📢"
    ];

    const emojiRain =
    setInterval(() => {

        const emoji =
        document.createElement("div");

        emoji.innerText =
        emojis[
            Math.floor(Math.random() * emojis.length)
        ];

        emoji.style.position = "fixed";
        emoji.style.top = "-80px";
        emoji.style.left =
        Math.random() * 100 + "vw";

        emoji.style.fontSize =
        (22 + Math.random() * 55) + "px";

        emoji.style.zIndex = "999999999";

        emoji.style.pointerEvents = "none";

        emoji.style.transition = "all linear 5s";

        document.documentElement.appendChild(emoji);

        setTimeout(() => {

            emoji.style.top = "110vh";
            emoji.style.transform =
            "rotate(720deg)";

            emoji.style.opacity = "0";

        }, 50);

        setTimeout(() => {
            emoji.remove();
        }, 6000);

    }, 70);

    let stopped = false;

    function stopDiscoExtrem() {

        if (stopped) return;

        stopped = true;

        clearInterval(emojiRain);

        document.body.classList.remove(
            "super-disco-mode",
            "disco-screen-shake",
            "disco-flash"
        );

        overlay.remove();

        discoAudio.pause();
        discoAudio.currentTime = 0;
    }

    discoAudio.addEventListener(
        "ended",
        stopDiscoExtrem
    );

    discoAudio.addEventListener(
        "error",
        stopDiscoExtrem
    );

discoAudio
.play()
.catch(() => {

    console.log(
        "Disco-Musik wurde vom Browser blockiert."
    );

});

setTimeout(() => {
    stopDiscoExtrem();
}, 180000);
}
function runEasterEggByType(type) {
    if (type === "taxi") runTaxiEgg();
    if (type === "crash") runCrashEgg();
    if (type === "disco") runDiscoEgg();
    if (type === "clean") runCleanEgg();
    if (type === "fire") runFireEgg();
    if (type === "superdisco") runSuperDiscoEgg();
    if (type === "ufo") runUfoEgg();
    if (type === "discoextrem") { runDiscoExtremEgg(data?.song); }
}

async function triggerGlobalEasterEgg(type) {
    const db = getDbClient();

    if (!db) {
        alert("Supabase Client nicht gefunden.");
        return;
    }

    const userRaw = localStorage.getItem("taxiUser");
    const user = userRaw ? JSON.parse(userRaw) : null;

    let song = null;

if (type === "discoextrem") {

    const songs = [
        "eastereggsound/2-unlimited-get-ready-for-this.mp3",
        "eastereggsound/crazy-chicken-klingelton.mp3",
        "eastereggsound/crazy-frog-remix.mp3",
        "eastereggsound/daft-punk.mp3",
        "eastereggsound/danza-kuduro.mp3",
        "eastereggsound/die-tasse-kaffee.mp3",
        "eastereggsound/dota-basshunter.mp3",
        "eastereggsound/hardcore-peniz-effect.mp3",
        "eastereggsound/mobelstuck.mp3",
        "eastereggsound/musica-barbie.mp3",
        "eastereggsound/smells-like-teen-spirit.mp3",
        "eastereggsound/tell-me-why-long.mp3",
        "eastereggsound/vengaboys-boom-boom-boom-boom.mp3"
    ];

    song =
    songs[
        Math.floor(Math.random() * songs.length)
    ];
}

const { error } = await db
    .from("taxi_easter_events")
    .insert([{
        event_type: type,
        created_by: user ? user.display_name : "Unbekannt",
        song: song
    }]);

    if (error) {
        console.error(error);
        alert("Easter Egg konnte nicht ausgelöst werden.");
    }
}

let lastSeenEasterEventId = null;

async function setupGlobalEasterEggs() {

    const db = getDbClient();

    if (!db) {
        console.error("Realtime konnte nicht gestartet werden.");
        return;
    }

    const { data } = await db
        .from("taxi_easter_events")
        .select("id")
        .order("created_at", {
            ascending: false
        })
        .limit(1)
        .maybeSingle();

    if (data) {
        lastSeenEasterEventId = data.id;
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

                lastSeenEasterEventId =
                payload.new.id;

                runEasterEggByType(
                    payload.new.event_type,
                    payload.new
                );
            }
        )
        .subscribe();

    setInterval(async () => {

        const { data, error } = await db
            .from("taxi_easter_events")
            .select("*")
            .order("created_at", {
                ascending: false
            })
            .limit(1)
            .maybeSingle();

        if (error || !data) return;

        if (
            data.id !==
            lastSeenEasterEventId
        ) {

            lastSeenEasterEventId =
            data.id;

            runEasterEggByType(
                data.event_type
            );
        }

    }, 3000);
}
