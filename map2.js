let map2Scale = 1;
let map2X = 0;
let map2Y = 0;

function searchPlz2() {
    const input = document.getElementById("plz_search_2").value.trim();
    const result = document.getElementById("plz_result_2");
    const marker = document.getElementById("map_marker_2");

    const box2 = document.getElementById("gtaMapBox2");
    const inner2 = document.getElementById("gtaMapInner2");
    const img2 = document.querySelector(".mini-map-img");

    const DATA = typeof PLZ_MAP_2 !== "undefined" ? PLZ_MAP_2 : PLZ_MAP;

    if (!input) {
        result.innerHTML = "";
        marker.style.display = "none";
        return;
    }

    const location = DATA[input];

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
            PLZ: ${input}
        </div>
    `;

    const pixelX = (location.x / 100) * img2.clientWidth;
    const pixelY = (location.y / 100) * img2.clientHeight;

    marker.style.display = "block";
    marker.style.left = `${pixelX}px`;
    marker.style.top = `${pixelY}px`;

    map2Scale = 5;

    map2X = (box2.clientWidth / 2) - (pixelX * map2Scale);
    map2Y = (box2.clientHeight / 2) - (pixelY * map2Scale);

    inner2.style.transform =
        `translate(${map2X}px, ${map2Y}px) scale(${map2Scale})`;
}
