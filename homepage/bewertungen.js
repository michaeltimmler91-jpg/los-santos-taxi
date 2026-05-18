const reviewForm =
document.getElementById(
  "reviewForm"
);

const reviewDriver =
document.getElementById(
  "reviewDriver"
);

const reviewName =
document.getElementById(
  "reviewName"
);

const reviewRating =
document.getElementById(
  "reviewRating"
);

const reviewText =
document.getElementById(
  "reviewText"
);

const reviewMessage =
document.getElementById(
  "reviewMessage"
);

const reviewsGrid =
document.getElementById(
  "reviewsGrid"
);

async function loadDriversForReview() {

  try {

    const { data, error } =
    await supabaseClient
      .from("taxi_driver_profiles")
      .select("username, display_name")
      .order("display_name");

    if (error) {
      throw error;
    }

    reviewDriver.innerHTML =
    `
      <option value="">
        Fahrer ausw&auml;hlen
      </option>
    `;

    data.forEach(driver => {

      reviewDriver.innerHTML += `
        <option value="${escapeAttribute(driver.username)}">
          ${escapeHtml(driver.display_name)}
        </option>
      `;

    });

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
      .limit(12);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {

      reviewsGrid.innerHTML =
      `
        <article class="review-card">
          <h3>
            Noch keine Bewertungen
          </h3>

          <p class="review-text">
            Sobald Bewertungen vorhanden sind,
            werden sie hier angezeigt.
          </p>
        </article>
      `;

      return;
    }

    reviewsGrid.innerHTML =
    data.map(review => {

      return `
        <article class="review-card">

          <div class="review-top">

            <div class="review-driver">
              ${escapeHtml(
                review.driver_display_name
              )}
            </div>

            <div class="review-stars">
              ${createStars(
                review.rating
              )}
            </div>

          </div>

          <div class="review-text">
            "${escapeHtml(
              review.review_text
            )}"
          </div>

          <div class="review-author">
            ${escapeHtml(
              review.reviewer_name
            )}
          </div>

          ${
            review.driver_reply
            ? `
              <div class="driver-answer">

                <div class="driver-answer-title">
                  Antwort vom Fahrer
                </div>

                <div class="driver-answer-text">
                  ${escapeHtml(
                    review.driver_reply
                  )}
                </div>

              </div>
            `
            : ""
          }

        </article>
      `;

    }).join("");

  } catch (err) {

    console.error(err);

    reviewsGrid.innerHTML =
    `
      <article class="review-card">
        <h3>
          Bewertungen konnten nicht geladen werden.
        </h3>
      </article>
    `;
  }
}

async function submitReview(event) {

  event.preventDefault();

  const selectedOption =
  reviewDriver.options[
    reviewDriver.selectedIndex
  ];

  const driverUsername =
  reviewDriver.value;

  const driverDisplayName =
  selectedOption.text.trim();

  if (
    !driverUsername ||
    !reviewName.value.trim() ||
    !reviewText.value.trim()
  ) {

    reviewMessage.innerHTML =
    "Bitte alle Pflichtfelder ausf&uuml;llen.";

    return;
  }

  reviewMessage.innerHTML =
  "Bewertung wird gespeichert...";

  try {

    const { error } =
    await supabaseClient
      .from("taxi_driver_reviews")
      .insert({

        driver_username:
        driverUsername,

        driver_display_name:
        driverDisplayName,

        reviewer_name:
        reviewName.value.trim(),

        review_text:
        reviewText.value.trim(),

        rating:
        Number(reviewRating.value),

        created_at:
        new Date().toISOString()

      });

    if (error) {
      throw error;
    }

    reviewForm.reset();

    reviewMessage.innerHTML =
    "✅ Bewertung erfolgreich gespeichert.";

    loadReviews();

  } catch (err) {

    console.error(err);

    reviewMessage.innerHTML =
    "❌ Bewertung konnte nicht gespeichert werden.";
  }
}

function createStars(rating) {

  const value =
  Number(rating) || 0;

  let stars = "";

  for (let i = 1; i <= 5; i++) {

    stars +=
    i <= value
    ? "★"
    : "☆";
  }

  return stars;
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

if (reviewForm) {

  reviewForm.addEventListener(
    "submit",
    submitReview
  );
}

loadDriversForReview();
loadReviews();
