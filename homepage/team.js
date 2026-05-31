const teamGrid =
document.getElementById(
  "teamGrid"
);

let allDrivers = [];
let allStatuses = [];
let allVacations = [];

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
      data: statusData
    } = await supabaseClient
      .from("taxi_driver_status")
      .select("*");

    allDrivers =
    data || [];

    allStatuses =
    statusData || [];

    allVacations =
    vacationData || [];

    if (!allDrivers.length) {

      teamGrid.innerHTML = `
        <article class="driver-card">
          <h3>
            Keine Fahrer gefunden
          </h3>
        </article>
      `;

      return;
    }

    teamGrid.innerHTML =
    allDrivers.map(driver => {

      const statusEntry =
      allStatuses.find(
        s => s.username === driver.username
      );

      const isOnline =
      statusEntry &&
      statusEntry.status === "Im Dienst";

      const shortBio =
      stripHtml(
        driver.bio_html ||
        driver.bio ||
        "Noch keine Beschreibung vorhanden."
      );

      const vacation =
  getActiveVacationForDriver(driver.username);

const vacationHtml =
  vacation
    ? `
      <div class="driver-vacation-box">
        🌴 Fahrer ist im Urlaub<br>
        von ${formatDateDE(vacation.start_date)}
        bis ${formatDateDE(vacation.end_date)}
      </div>
    `
    : "";
      
      return `
        <article class="driver-card">

          <div class="driver-avatar">

            ${
              driver.profile_image_url
              ? `
                <img
                  src="${escapeAttribute(driver.profile_image_url)}"
                  alt="${escapeAttribute(driver.display_name)}"
                >
              `
              : "LS"
            }

          </div>

          <h3>
            ${escapeHtml(driver.display_name)}
          </h3>

          <div class="driver-role">
            Fahrer
          </div>

          <p class="driver-text">
            ${escapeHtml(shortBio)}
          </p>

          <div class="driver-meta">

            <span class="
              driver-pill
              ${isOnline ? "online" : "offline"}
            ">
              ${
                isOnline
                ? "Verf&uuml;gbar"
                : "Nicht verf&uuml;gbar"
              }
            </span>

          </div>

          <button
            class="driver-profile-btn"
            onclick="openDriverModal('${escapeAttribute(driver.username)}')"
          >
            Profil ansehen
          </button>

        </article>
      `;

    }).join("");

  } catch (err) {

    console.error(err);

    teamGrid.innerHTML = `
      <article class="driver-card">
        <h3>
          Team konnte nicht geladen werden
        </h3>
      </article>
    `;
  }
}

function openDriverModal(username) {

  const driver =
  allDrivers.find(
    d => d.username === username
  );

  if (!driver) {
    return;
  }

  const statusEntry =
  allStatuses.find(
    s => s.username === driver.username
  );

  const isOnline =
  statusEntry &&
  statusEntry.status === "Im Dienst";

  const modal =
  document.getElementById("driverModal");

  const image =
  document.getElementById("modalDriverImage");

  const placeholder =
  document.getElementById("modalDriverPlaceholder");

  document.getElementById("modalDriverName").innerHTML =
  escapeHtml(driver.display_name || "Fahrer");

  const status =
  document.getElementById("modalDriverStatus");

  const {
  data: vacationData
} = await supabaseClient
  .from("taxi_vacations")
  .select("*");

  status.classList.remove(
    "online",
    "offline"
  );

  status.classList.add(
    isOnline ? "online" : "offline"
  );

  status.innerHTML =
  isOnline
  ? "Verf&uuml;gbar"
  : "Nicht verf&uuml;gbar";

  if (driver.profile_image_url) {

    image.src =
    driver.profile_image_url;

    image.style.display =
    "block";

    placeholder.style.display =
    "none";

  } else {

    image.style.display =
    "none";

    placeholder.style.display =
    "grid";
  }

  const bioHtml =
  driver.bio_html ||
  escapeHtml(
    driver.bio ||
    "Noch keine Beschreibung vorhanden."
  );

  document.getElementById("modalDriverBio").innerHTML =
  DOMPurify
  ? DOMPurify.sanitize(bioHtml)
  : bioHtml;

  modal.classList.add("open");

  document.body.style.overflow =
  "hidden";
}

function closeDriverModal() {

  document
    .getElementById("driverModal")
    .classList.remove("open");

  document.body.style.overflow =
  "";
}

function stripHtml(value) {

  const div =
  document.createElement("div");

  div.innerHTML =
  value;

  return div.textContent || div.innerText || "";
}

function escapeHtml(value) {

  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {

  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function getActiveVacationForDriver(username) {

  const today =
    new Date();

  today.setHours(0, 0, 0, 0);

  return allVacations.find(vacation => {

    if (vacation.username !== username) {
      return false;
    }

    const start =
      new Date(vacation.start_date);

    const end =
      new Date(vacation.end_date);

    end.setHours(23, 59, 59, 999);

    return today >= start && today <= end;
  });
}

function formatDateDE(value) {

  if (!value) return "-";

  return new Date(value).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

loadTeam();
