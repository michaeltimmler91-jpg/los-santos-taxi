const SUPABASE_URL = "DEINE_SUPABASE_URL_HIER";
const SUPABASE_KEY = "DEIN_SUPABASE_ANON_KEY_HIER";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const teamGrid = document.getElementById("teamGrid");

async function loadTeam() {
  try {
    const { data, error } = await supabaseClient
      .from("driver_profiles")
      .select("*")
      .eq("public_visible", true)
      .order("display_name", { ascending: true });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      teamGrid.innerHTML = `
        <article class="driver-card muted">
          <div class="driver-avatar placeholder">LS</div>
          <h3>Noch keine Fahrerprofile</h3>
          <p class="driver-text">
            Sobald Profile freigegeben sind, werden sie hier angezeigt.
          </p>
        </article>
      `;
      return;
    }

    teamGrid.innerHTML = data.map(driver => {
      const name = escapeHtml(driver.display_name || "Fahrer");
      const role = escapeHtml(driver.role || "Fahrer");
      const bio = escapeHtml(driver.public_bio || "Noch keine Beschreibung vorhanden.");
      const image = driver.avatar_url || "";
      const rating = driver.avg_rating ? Number(driver.avg_rating).toFixed(1) : "-";
      const isOnline = driver.is_online === true;

      const avatar = image
        ? `<img src="${escapeAttribute(image)}" alt="${name}" />`
        : getInitials(name);

      return `
        <article class="driver-card">
          <div class="driver-avatar">${avatar}</div>

          <h3>${name}</h3>
          <div class="driver-role">${role}</div>

          <p class="driver-text">${bio}</p>

          <div class="driver-meta">
            <span class="driver-pill ${isOnline ? "online" : "offline"}">
              ${isOnline ? "Verf&uuml;gbar" : "Nicht verf&uuml;gbar"}
            </span>
            <span class="driver-pill">★ ${rating}</span>
          </div>
        </article>
      `;
    }).join("");
  } catch (err) {
    console.error(err);

    teamGrid.innerHTML = `
      <article class="driver-card muted">
        <div class="driver-avatar placeholder">!</div>
        <h3>Team konnte nicht geladen werden</h3>
        <p class="driver-text">
          Die Fahrerprofile konnten gerade nicht angezeigt werden.
        </p>
      </article>
    `;
  }
}

function getInitials(name) {
  const parts = name.trim().split(" ").filter(Boolean);

  if (parts.length === 0) {
    return "LS";
  }

  if (parts.length === 1) {
    return escapeHtml(parts[0].substring(0, 2).toUpperCase());
  }

  return escapeHtml((parts[0][0] + parts[1][0]).toUpperCase());
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

loadTeam();
