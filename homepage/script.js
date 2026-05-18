const liveIndicator =
document.getElementById(
  "liveIndicator"
);

const liveBannerTitle =
document.getElementById(
  "liveBannerTitle"
);

const liveBannerDrivers =
document.getElementById(
  "liveBannerDrivers"
);

const orderForm =
document.getElementById(
  "orderForm"
);

const orderMessage =
document.getElementById(
  "orderMessage"
);

const reviewsGrid =
document.getElementById(
  "reviewsGrid"
);

async function loadTaxiStatus() {

  try {

    const { data, error } =
    await supabaseClient
      .from("taxi_driver_status")
      .select("*")
      .eq("status", "Im Dienst");

    if (error) {
      throw error;
    }

    const count =
    data ? data.length : 0;

    if(count > 0){

  liveIndicator.classList.remove(
    "offline"
  );

  liveIndicator.classList.add(
    "online"
  );

  liveBannerTitle.innerHTML =
  "Fahrer aktuell verf&uuml;gbar";

  liveBannerDrivers.innerHTML =
  count === 1
  ? "1 Fahrer im Dienst"
  : count + " Fahrer im Dienst";

} else {

  liveIndicator.classList.remove(
    "online"
  );

  liveIndicator.classList.add(
    "offline"
  );

  liveBannerTitle.innerHTML =
  "Aktuell keine Fahrer verf&uuml;gbar";

  liveBannerDrivers.innerHTML =
  "Bitte sp&auml;ter erneut versuchen";
}


  } catch (err) {

    console.error(err);

  }
}

async function loadReviews() {

  try {

    const { data, error } =
    await supabaseClient
      .from("taxi_driver_reviews")
      .select("*")
      .order("created_at", {
        ascending: false
      })
      .limit(6);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {

      reviewsGrid.innerHTML = `
        <article class="info-card">
          <h3>
            Noch keine Bewertungen
          </h3>
        </article>
      `;

      return;
    }

    reviewsGrid.innerHTML =
    data.map(review => {

      return `
        <article class="info-card">

          <div class="review-stars">
            ${createStars(review.rating)}
          </div>

          <h3>
            ${escapeHtml(
              review.driver_display_name
            )}
          </h3>

          <div class="review-driver">
            Bewertung von
            ${escapeHtml(
              review.reviewer_name
            )}
          </div>

          <p>
            ${escapeHtml(
              review.review_text
            )}
          </p>

          ${
            review.driver_reply
            ? `
              <div class="driver-answer">

                <strong>
                  Antwort:
                </strong>

                <br>

                ${escapeHtml(
                  review.driver_reply
                )}

              </div>
            `
            : ""
          }

        </article>
      `;

    }).join("");

  } catch (err) {

    console.error(err);

  }
}

async function submitOrder(event) {

  event.preventDefault();

  const customerName =
  document.getElementById("customerName").value.trim();

  const pickup =
  document.getElementById("pickup").value.trim();

  const destination =
  document.getElementById("destination").value.trim();

  const note =
  document.getElementById("note").value.trim();

  if (
    !customerName ||
    !pickup ||
    !destination
  ) {

    orderMessage.innerHTML =
    "Bitte alle Pflichtfelder ausf&uuml;llen.";

    return;
  }

  orderMessage.innerHTML =
  "Fahrt wird angefragt...";

  try {

    const { error } =
    await supabaseClient
      .from("taxi_jobs")
      .insert({

        created_at:
        new Date().toISOString(),

        created_by:
        "Homepage",

        job_status:
        "Offen",

        ride_type:
        "Normale Fahrt",

        pickup_location:
        pickup,

        destination:
        destination,

        customer_name:
        customerName,

        notes:
        note,

        billed_to:
        "Kunde",

        kilometers:
        0,

        fare_amount:
        0,

        invoice_amount:
        0,

        tip_amount:
        0,

        food_cost:
        0,

        refund_amount:
        0,

        tip_paid:
        false,

        dealer_paid:
        false

      });

    if (error) {
      throw error;
    }

    orderForm.reset();

    orderMessage.innerHTML =
    "Fahrt erfolgreich angefragt.";

  } catch (err) {

    console.error(err);

    orderMessage.innerHTML =
    "Auftrag konnte nicht gesendet werden.";
  }
}
function createStars(rating) {

  let stars = "";

  for(let i = 1; i <= 5; i++){

    stars +=
    i <= rating
    ? "★"
    : "☆";
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

if(orderForm){

  orderForm.addEventListener(
    "submit",
    submitOrder
  );
}

loadTaxiStatus();
loadReviews();

setInterval(
  loadTaxiStatus,
  60000
);
