let mapScale = 1;
let mapX = 0;
let mapY = 0;

let isDragging = false;
let mouseDownX = 0;
let mouseDownY = 0;
let dragStartX = 0;
let dragStartY = 0;

const box = document.getElementById("gtaMapBox");
const inner = document.getElementById("gtaMapInner");
const img = document.querySelector(".gta-map-img");

let debugBox = document.getElementById("map_debug");

if (debugBox) {
    document.body.appendChild(debugBox);
}

function showDebug(text) {
    if (debugBox) {
        debugBox.innerText = text;
        debugBox.style.display = "block";
    }

    console.log(text);
}

function placeMarker(pixelX, pixelY) {
    const marker = document.getElementById("map_marker");

    marker.style.display = "block";
    marker.style.left = `${pixelX}px`;
    marker.style.top = `${pixelY}px`;
}

function searchPlz() {
    const input = document.getElementById("plz_search").value.trim();
    const result = document.getElementById("plz_result");
    const marker = document.getElementById("map_marker");

    if (!input) {
        result.innerHTML = "";
        marker.style.display = "none";
        return;
    }

    let foundPlz = input;
    let location = PLZ_MAP[input];

    if (!location) {
        const search = input.toLowerCase();

        for (const [plz, data] of Object.entries(PLZ_MAP)) {
            if (
                data.name.toLowerCase().includes(search) ||
                (data.aliases || []).some(alias =>
                    alias.toLowerCase().includes(search)
                )
            ) {
                foundPlz = plz;
                location = data;
                break;
            }
        }
    }

    if (!location) {
        result.innerHTML = `
            <div class="admin-card">
                ❌ PLZ nicht gefunden.
            </div>
        `;

        marker.style.display = "none";
        return;
    }

    result.innerHTML = `
        <div class="admin-card">
            <strong>${location.name}</strong><br>
            PLZ: ${foundPlz}<br>
            X: ${location.x} | Y: ${location.y}
        </div>
    `;

    const pixelX = (location.x / 100) * img.clientWidth;
    const pixelY = (location.y / 100) * img.clientHeight;

    placeMarker(pixelX, pixelY);
    zoomToLocation(pixelX, pixelY);
}

function updateMapTransform() {
    inner.style.transform =
        `translate(${mapX}px, ${mapY}px) scale(${mapScale})`;
}

function zoomMap(factor) {
    mapScale *= factor;

    if (mapScale < 1) mapScale = 1;
    if (mapScale > 6) mapScale = 6;

    updateMapTransform();
}

function resetMap() {
    mapScale = 1;
    mapX = 0;
    mapY = 0;

    updateMapTransform();
}

box.addEventListener("mousedown", e => {
    isDragging = false;

    mouseDownX = e.clientX;
    mouseDownY = e.clientY;

    dragStartX = e.clientX - mapX;
    dragStartY = e.clientY - mapY;

    window.addEventListener("mousemove", dragMap);
});

function dragMap(e) {
    const moved =
        Math.abs(e.clientX - mouseDownX) +
        Math.abs(e.clientY - mouseDownY);

    if (moved < 5) return;

    isDragging = true;

    mapX = e.clientX - dragStartX;
    mapY = e.clientY - dragStartY;

    updateMapTransform();
}

window.addEventListener("mouseup", () => {
    window.removeEventListener("mousemove", dragMap);
});

box.addEventListener("click", function(e) {
    if (isDragging) return;

    const boxRect = box.getBoundingClientRect();

    const rawX =
        (e.clientX - boxRect.left - mapX) / mapScale;

    const rawY =
        (e.clientY - boxRect.top - mapY) / mapScale;

    const percentX =
        (rawX / img.clientWidth) * 100;

    const percentY =
        (rawY / img.clientHeight) * 100;

    const debugText =
        `x: ${percentX.toFixed(2)}, y: ${percentY.toFixed(2)}`;

    showDebug(debugText);

    document.getElementById("plz_result").innerHTML = `
    <div class="admin-card">
        <strong>Klick-Position</strong><br><br>

        <div id="click_coords">
            ${debugText}
        </div>

        <button
            class="small-btn"
            style="margin-top:14px;"
            onclick="copyCoords()"
        >
            📋 Kopieren
        </button>
    </div>
`;

    placeMarker(rawX, rawY);
});

function zoomToLocation(pixelX, pixelY) {
    mapScale = 4;

    mapX = (box.clientWidth / 2) - (pixelX * mapScale);
    mapY = (box.clientHeight / 2) - (pixelY * mapScale);

    updateMapTransform();
}
