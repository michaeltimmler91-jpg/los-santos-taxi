const PLZ_MAP = {
    "8054": {
        name: "Mirror Park",
        x: 58,
        y: 42
    },

    "8170": {
        name: "LSMD",
        x: 49,
        y: 63
    },

    "10012": {
        name: "Hookies",
        x: 54,
        y: 67
    },

    "9321": {
        name: "Sandy Shores",
        x: 55,
        y: 30
    }
};

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
