let mapScale = 1;
let mapX = 0;
let mapY = 0;

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

const box = document.getElementById("gtaMapBox");
const inner = document.getElementById("gtaMapInner");
const img = document.querySelector(".gta-map-img");

const MARKER_OFFSET_X = 14;
const MARKER_OFFSET_Y = 28;

function placeMarker(percentX, percentY) {

    const marker = document.getElementById("map_marker");

    const pixelX =
        (percentX / 100) * img.clientWidth;

    const pixelY =
        (percentY / 100) * img.clientHeight;

    marker.style.display = "block";

    marker.style.left = `${pixelX - MARKER_OFFSET_X}px`;
    marker.style.top = `${pixelY - MARKER_OFFSET_Y}px`;

    return {
        pixelX,
        pixelY
    };
}

function searchPlz() {

    const input =
        document.getElementById("plz_search")
        .value
        .trim();

    const result =
        document.getElementById("plz_result");

    const marker =
        document.getElementById("map_marker");

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
