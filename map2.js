let map2Scale = 1;
let map2X = 0;
let map2Y = 0;

const box2 = document.getElementById("gtaMapBox2");
const inner2 = document.getElementById("gtaMapInner2");
const img2 = document.querySelector(".mini-map-img");

function placeMarker2(pixelX, pixelY) {
    const marker = document.getElementById("map_marker_2");

    marker.style.display = "block";
    marker.style.left = `${pixelX}px`;
    marker.style.top = `${pixelY}px`;
}

function searchPlz2() {
    const input = document.getElementById("plz_search_2").value.trim();
    const result = document.getElementById("plz_result_2");
    const marker = document.getElementById("map_marker_2");

    if (!input) {
        result.innerHTML = "";
        marker.style.display = "none";
        return;
    }

    let foundPlz = input;
    let location = PLZ_MAP_2[input];

    if (!location) {
        const search = input.toLowerCase();

        for (const [plz, data] of Object.entries(PLZ_MAP_2)) {
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

    const pixelX = (location.x / 100) * img2.clientWidth;
    const pixelY = (location.y / 100) * img2.clientHeight;

    placeMarker2(pixelX, pixelY);
    zoomToLocation2(pixelX, pixelY);
}

function updateMap2Transform() {
    inner2.style.transform =
        `translate(${map2X}px, ${map2Y}px) scale(${map2Scale})`;
}

function zoomToLocation2(pixelX, pixelY) {
    map2Scale = 4;

    map2X = (box2.clientWidth / 2) - (pixelX * map2Scale);
    map2Y = (box2.clientHeight / 2) - (pixelY * map2Scale);

    updateMap2Transform();
}
