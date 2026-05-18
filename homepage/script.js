const SUPABASE_URL = "DEINE_SUPABASE_URL_HIER";
const SUPABASE_KEY = "DEIN_SUPABASE_ANON_KEY_HIER";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const taxiStatusText = document.getElementById("taxiStatusText");
const taxiStatusSubtext = document.getElementById("taxiStatusSubtext");
const taxiStatusDot = document.getElementById("taxiStatusDot");
const taxiDriverCount = document.getElementById("taxiDriverCount");

const orderForm = document.getElementById("orderForm");
const orderMessage = document.getElementById("orderMessage");
const reviewsGrid = document.getElementById("reviewsGrid");

async function loadTaxiStatus() {
  try {
    const { data, error } = await supabaseClient
      .from("driver_status")
      .select("*")
      .eq("is_online", true);

    if (error) {
      throw error;
    }

    const count = data ? data.length : 0;

    taxiStatusDot.classList.remove("loading", "online", "offline");

    if (count > 0) {
      taxiStatusText.textContent = "Taxi verf&uuml;gbar";
      taxiStatusSubtext.textContent = "Aktuell sind Fahrer im Dienst.";
      taxiStatusDot.classList.add("online");
      taxiDriverCount.textContent = count === 1 ? "1 Fahrer verf&uuml;gbar" : count + " Fahrer verf&uuml;gbar";
    } else {
      taxiStatusText.textContent = "Aktuell kein Taxi verf&uuml;gbar";
      taxiStatusSubtext.textContent = "Bitte versuche es sp&auml;ter erneut.";
      taxiStatusDot.classList.add("offline");
      taxiDriverCount.textContent = "Kein Fahrer verf&uuml;gbar";
    }
  } catch (err) {
    console.error(err);

    taxiStatusDot.classList.remove("loading", "online");
    taxiStatusDot.classList.add("offline");

    taxiStatusText.textContent = "Status nicht verf&uuml;gbar";
    taxiStatusSubtext.textContent = "Die Verbindung zur Leitstelle konnte nicht hergestellt werden.";
    taxiDriverCount.textContent = "Keine Daten geladen";
  }
}

async function submitOrder(event) {
  event.preventDefault();

  const customerName = document.getElementById("customerName").value.trim();
  const pickup = document.getElementById("pickup").value.trim();
  const destination = document.getElementById("destination").value.trim();
  const note = document.getElementById("note").value.trim();

  if (!customerName || !pickup || !destination) {
    orderMessage.textContent = "Bitte Name, Abholort und Ziel eintragen.";
    return;
  }

  orderMessage.textContent = "Anfrage wird gesendet...";

  try {
    const { error } = await supabaseClient
      .from("company_orders")
      .insert({
        customer_name: customerName,
        pickup: pickup,
        destination: destination,
        note: note,
        status: "open",
        created_at: new Date().toISOString()
      });

    if (error) {
      throw error;
    }

    orderForm.reset();
    orderMessage.textContent = "Deine Fahrt wurde erfolgreich angefragt.";
  } catch (err) {
    console.error(err);
    orderMessage.textContent = "Die Anfrage konnte nicht gesendet werden.";
  }
}

async function loadReviews() {
  try {
    const { data, error } = await supabaseClient
      .from("driver_reviews")
      .select("*")
      .eq("visible", true)
      .order("created_at", { ascending: false })
      .limit(6);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      reviewsGrid.innerHTML = `
        <article class="info-card muted">
          <h3>Noch keine Bewertungen</h3>
          <p>Sobald Bewertungen vorhanden sind, werden sie hier angezeigt.</p>
        </article>
      `;
      return;
    }

    reviewsGrid.innerHTML = data.map(review => {
      const stars = createStars(review.rating || 0);
      const driverName = escapeHtml(review.driver_name || "Los Santos Taxi");
      const text = escapeHtml(review.text || "");
      const answer = escapeHtml(review.driver_answer || "");

      return `
        <article class="info-card">
          <div class="review-stars">${stars}</div>
          <h3>${driverName}</h3>
          <p>${text}</p>
          ${answer ? `<div class="driver-answer">${answer}</div>` : ""}
        </article>
      `;
    }).join("");
  } catch (err) {
    console.error(err);

    reviewsGrid.innerHTML = `
      <article class="info-card muted">
        <h3>Bewertungen nicht geladen</h3>
        <p>Die Bewertungen konnten gerade nicht angezeigt werden.</p>
      </article>
    `;
  }
}

function createStars(rating) {
  const full = Math.max(0, Math.min(5, Number(rating)));
  let stars = "";

  for (let i = 1; i <= 5; i++) {
    stars += i <= full ? "★" : "☆";
  }

  return stars;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

if (orderForm) {
  orderForm.addEventListener("submit", submitOrder);
}

loadTaxiStatus();
loadReviews();

setInterval(loadTaxiStatus, 60000);
