let serviceMapScale = 1;
let serviceMapX = 0;
let serviceMapY = 0;

function searchServicePlz() {
    const input = document.getElementById("service_plz_search").value.trim();
    const result = document.getElementById("service_plz_result");
    const marker = document.getElementById("service_map_marker");

    const box = document.getElementById("serviceMapBox");
    const inner = document.getElementById("serviceMapInner");
    const img = document.querySelector(".service-map-img");

    if (!input) {
        result.innerHTML = "";
        marker.style.display = "none";
        return;
    }

    const location = PLZ_MAP[input];

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

    const pixelX = (location.x / 100) * img.clientWidth;
    const pixelY = (location.y / 100) * img.clientHeight;

    marker.style.display = "block";
    marker.style.left = `${pixelX}px`;
    marker.style.top = `${pixelY}px`;

    serviceMapScale = 5;

    serviceMapX = (box.clientWidth / 2) - (pixelX * serviceMapScale);
    serviceMapY = (box.clientHeight / 2) - (pixelY * serviceMapScale);

    inner.style.transform =
        `translate(${serviceMapX}px, ${serviceMapY}px) scale(${serviceMapScale})`;
}
