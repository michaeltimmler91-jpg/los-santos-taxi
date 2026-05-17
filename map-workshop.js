let workshopMapScale = 1;
let workshopMapX = 0;
let workshopMapY = 0;

function searchWorkshopPlz() {
    const input = document.getElementById("workshop_plz_search").value.trim();
    const result = document.getElementById("workshop_plz_result");
    const marker = document.getElementById("workshop_map_marker");

    const box = document.getElementById("workshopMapBox");
    const inner = document.getElementById("workshopMapInner");
    const img = document.querySelector(".workshop-mini-map-img");

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

    workshopMapScale = 5;

    workshopMapX = (box.clientWidth / 2) - (pixelX * workshopMapScale);
    workshopMapY = (box.clientHeight / 2) - (pixelY * workshopMapScale);

    inner.style.transform =
        `translate(${workshopMapX}px, ${workshopMapY}px) scale(${workshopMapScale})`;
}
