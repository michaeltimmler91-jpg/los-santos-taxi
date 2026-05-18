const teamGrid =
document.getElementById(
  "teamGrid"
);

async function loadTeam() {

  try {

    const { data, error } =
    await supabaseClient
      .from("taxi_driver_profiles")
      .select("*")
      .order("display_name", {
        ascending: true
      });

    if (error) {
      throw error;
    }

    const {
      data:statusData
    } = await supabaseClient
      .from("taxi_driver_status")
      .select("*");

    teamGrid.innerHTML =
    data.map(driver => {

      const statusEntry =
      statusData.find(
        s => s.username === driver.username
      );

      const isOnline =
      statusEntry &&
      statusEntry.status ===
      "Im Dienst";

      return `
        <a class="driver-card driver-card-link" href="../profil?fahrer=${encodeURIComponent(driver.username)}">

          <div class="driver-avatar">

            ${
              driver.profile_image_url
              ? `
                <img
                  src="${driver.profile_image_url}"
                >
              `
              : "LS"
            }

          </div>

          <h3>
            ${escapeHtml(
              driver.display_name
            )}
          </h3>

          <div class="driver-role">
            Fahrer
          </div>

          <p class="driver-text">
            ${
              escapeHtml(
                driver.bio ||
                "Noch keine Beschreibung vorhanden."
              )
            }
          </p>

          <div class="driver-meta">

            <span class="
              driver-pill
              ${
                isOnline
                ? "online"
                : "offline"
              }
            ">

              ${
                isOnline
                ? "Verf&uuml;gbar"
                : "Offline"
              }

            </span>

          </div>

        </a>
      `;

    }).join("");

  } catch (err) {

    console.error(err);

  }
}

function escapeHtml(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

loadTeam();
