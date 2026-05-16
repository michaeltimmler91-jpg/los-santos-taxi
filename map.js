function searchPlz() {
    const input = document.getElementById("plz_search").value.trim();
    const result = document.getElementById("plz_result");
    const marker = document.getElementById("map_marker");

    if (!input) {
        result.innerHTML = "";
        marker.style.display = "none";
        return;
    }

    let location = PLZ_MAP[input];

if (!location) {

    for (const [plz, data] of Object.entries(PLZ_MAP)) {

        const search = input.toLowerCase();

        if (
            data.name.toLowerCase().includes(search)
            ||
            (data.aliases || []).some(alias =>
                alias.toLowerCase().includes(search)
            )
        ) {
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
            PLZ: ${input}
        </div>
    `;

    marker.style.display = "block";
    marker.style.left = `${location.x}%`;
    marker.style.top = `${location.y}%`;
}
const mapBox = document.querySelector(".gta-map-box");

mapBox.addEventListener("click", function(e) {

    const rect = mapBox.getBoundingClientRect();

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    document.getElementById("map_debug").innerText =
        `X: ${x.toFixed(1)} | Y: ${y.toFixed(1)}`;

    const marker = document.getElementById("map_marker");

    marker.style.display = "block";
    marker.style.left = `${x}%`;
    marker.style.top = `${y}%`;
});
