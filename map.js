function searchPlz() {
    const input = document.getElementById("plz_search").value.trim();
    const result = document.getElementById("plz_result");
    const marker = document.getElementById("map_marker");

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

    marker.style.display = "block";
    marker.style.left = `${location.x}%`;
    marker.style.top = `${location.y}%`;
}
