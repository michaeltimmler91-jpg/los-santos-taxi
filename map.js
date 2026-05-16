let mapScale = 1;
let mapX = 0;
let mapY = 0;

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

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
            PLZ: ${foundPlz}
        </div>
    `;

    marker.style.display = "block";
    marker.style.left = `${location.x}%`;
    marker.style.top = `${location.y}%`;
}

function updateMapTransform() {
    const inner = document.getElementById("gtaMapInner");

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

const box = document.getElementById("gtaMapBox");
const inner = document.getElementById("gtaMapInner");

box.addEventListener("click", function(e) {
    if (isDragging) return;

    const rect = inner.getBoundingClientRect();

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    document.getElementById("map_debug").innerText =
        `X: ${x.toFixed(1)} | Y: ${y.toFixed(1)}`;

    const marker = document.getElementById("map_marker");

    marker.style.display = "block";
    marker.style.left = `${x}%`;
    marker.style.top = `${y}%`;
});

box.addEventListener("mousedown", e => {
    isDragging = false;

    dragStartX = e.clientX - mapX;
    dragStartY = e.clientY - mapY;

    window.addEventListener("mousemove", dragMap);
});

function dragMap(e) {
    isDragging = true;

    mapX = e.clientX - dragStartX;
    mapY = e.clientY - dragStartY;

    updateMapTransform();
}

window.addEventListener("mouseup", () => {
    window.removeEventListener("mousemove", dragMap);
});
