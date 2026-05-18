const taxiStatusText =
document.getElementById(
  "taxiStatusText"
);

const taxiStatusSubtext =
document.getElementById(
  "taxiStatusSubtext"
);

const taxiStatusDot =
document.getElementById(
  "taxiStatusDot"
);

const taxiDriverCount =
document.getElementById(
  "taxiDriverCount"
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

    taxiStatusDot.classList.remove(
      "loading",
      "online",
      "offline"
    );

    if (count > 0) {

      taxiStatusText.innerHTML =
      "Taxi verf&uuml;gbar";

      taxiStatusSubtext.innerHTML =
      "Aktuell sind Fahrer im Dienst.";

      taxiStatusDot.classList.add(
        "online"
      );

      taxiDriverCount.innerHTML =
      count === 1
      ? "1 Fahrer verf&uuml;gbar"
      : count +
        " Fahrer verf&uuml;gbar";

    } else {

      taxiStatusText.innerHTML =
      "Aktuell kein Taxi verf&uuml;gbar";

      taxiStatusSubtext.innerHTML =
      "Bitte versuche es sp&auml;ter erneut.";

      taxiStatusDot.classList.add(
        "offline"
      );

      taxiDriverCount.innerHTML =
      "Kein Fahrer verf&uuml;gbar";
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

  orderMessage.innerHTML =
  "Auftrag wird gesendet...";

  setTimeout(() => {

    orderMessage.innerHTML =
    "Auftrag erfolgreich gesendet.";

  }, 1000);
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
