document.addEventListener("DOMContentLoaded", () => {
    loadDriverProfile();
});

function getProfileUsername() {
    const params = new URLSearchParams(window.location.search);
    return params.get("fahrer") || "";
}

async function loadDriverProfile() {
    const box = document.getElementById("profile_box");
    const username = getProfileUsername();

    if (!username) {
        box.innerHTML = `
            <div class="admin-card">
                <strong>Profil nicht gefunden</strong><br>
                Es wurde kein Fahrer angegeben.
            </div>
        `;
        return;
    }

    const { data: profile, error } = await client
        .from("taxi_driver_profiles")
        .select("*")
        .eq("username", username)
        .eq("public_visible", true)
        .maybeSingle();

    if (error || !profile) {
        console.error(error);

        box.innerHTML = `
            <div class="admin-card">
                <strong>Profil nicht gefunden</strong><br>
                Dieses Fahrerprofil ist nicht öffentlich sichtbar.
            </div>
        `;
        return;
    }

    const { data: statusData } = await client
        .from("taxi_driver_status")
        .select("*")
        .eq("username", username)
        .maybeSingle();

    const { data: reviews } = await client
        .from("taxi_driver_reviews")
        .select("*")
        .eq("driver_username", username)
        .eq("visible", true)
        .order("created_at", { ascending: false });

    const reviewList = reviews || [];
    const ratingAverage = getAverageRating(reviewList);

    const statusText = getStatusText(statusData);
    const sinceText = profile.taxi_since
        ? new Date(profile.taxi_since).toLocaleDateString("de-DE")
        : "Nicht angegeben";

    box.innerHTML = `
        <div class="profile-layout">

            <div class="profile-card-main">

                <div class="profile-hero">

                    <div class="profile-avatar-wrap">
                        ${profile.profile_image_url
                            ? `<img src="${escapeAttr(profile.profile_image_url)}" class="profile-avatar" alt="Profilbild">`
                            : `<div class="profile-avatar-placeholder">🚕</div>`
                        }
                    </div>

                    <div class="profile-info">
                        <h1>${escapeHtml(profile.display_name)}</h1>

                        <div class="profile-meta">
                            ${statusText}<br>
                            📅 Beim Taxi seit: ${escapeHtml(sinceText)}
                        </div>

                        <div class="profile-stars">
                            ${renderStars(ratingAverage)}
                            <span>${ratingAverage.toFixed(1)} / 5</span>
                        </div>
                    </div>

                </div>

                <div class="profile-section">
                    <h2>Über mich</h2>

                    <p>
                        ${profile.bio_html
                            ? DOMPurify.sanitize(profile.bio_html)
                                : profile.bio
                                ? escapeHtml(profile.bio).replaceAll("\n", "<br>")
                                : "Dieser Fahrer hat noch keine Bio eingetragen."
                        }
                    </p>
                </div>

            </div>

            <div class="profile-card-side">

                <h2>Bewertung abgeben</h2>

                <div class="field">
                    <label>Dein Name</label>
                    <input type="text" id="reviewer_name" placeholder="Optional">
                </div>

                <div class="field">
                    <label>Sterne</label>
                    <select id="review_rating">
                        <option value="5">⭐⭐⭐⭐⭐ 5 Sterne</option>
                        <option value="4">⭐⭐⭐⭐ 4 Sterne</option>
                        <option value="3">⭐⭐⭐ 3 Sterne</option>
                        <option value="2">⭐⭐ 2 Sterne</option>
                        <option value="1">⭐ 1 Stern</option>
                    </select>
                </div>

                <div class="field">
                    <label>Bewertung</label>
                    <textarea id="review_text" rows="5" placeholder="Wie war die Fahrt?"></textarea>
                </div>

                <button onclick="sendDriverReview('${escapeAttr(profile.username)}', '${escapeAttr(profile.display_name)}')">
                    Bewertung senden
                </button>

            </div>

        </div>

        <div class="card profile-reviews-card">
            <h2>Bewertungen</h2>

            ${renderReviews(reviewList)}
        </div>
    `;
}

function getAverageRating(reviews) {
    if (!reviews || reviews.length === 0) {
        return 0;
    }

    const sum = reviews.reduce((total, review) => {
        return total + Number(review.rating || 0);
    }, 0);

    return sum / reviews.length;
}

function renderStars(value) {
    const rounded = Math.round(value);
    let html = "";

    for (let i = 1; i <= 5; i++) {
        html += i <= rounded ? "⭐" : "☆";
    }

    return html;
}

function getStatusText(statusData) {
    if (!statusData) {
        return "🔴 Aktuell offline";
    }

    if (statusData.status === "Im Dienst") {
        return "🟢 Gerade im Dienst";
    }

    if (statusData.status === "Pause") {
        return "🟡 Gerade in Pause";
    }

    return "🔴 Aktuell offline";
}

function renderReviews(reviews) {
    if (!reviews || reviews.length === 0) {
        return `
            <div class="admin-card">
                Noch keine Bewertungen vorhanden.
            </div>
        `;
    }

    return reviews.map(review => `
        <div class="profile-review">
            <div class="profile-review-head">
                <strong>${escapeHtml(review.reviewer_name || "Anonym")}</strong>
                <span>${renderStars(Number(review.rating || 0))}</span>
            </div>

            <div class="profile-review-text">
                ${escapeHtml(review.review_text || "").replaceAll("\n", "<br>")}
            </div>

            ${review.driver_reply
                ? `
                    <div class="profile-driver-reply">
                        <strong>Antwort vom Fahrer:</strong><br>
                        ${escapeHtml(review.driver_reply).replaceAll("\n", "<br>")}
                    </div>
                `
                : ""
            }
        </div>
    `).join("");
}

async function sendDriverReview(driverUsername, driverDisplayName) {
    const name = document.getElementById("reviewer_name").value.trim();
    const rating = Number(document.getElementById("review_rating").value);
    const text = document.getElementById("review_text").value.trim();

    if (!rating || rating < 1 || rating > 5) {
        alert("Bitte Sterne auswählen.");
        return;
    }

    if (!text) {
        alert("Bitte eine kurze Bewertung schreiben.");
        return;
    }

    const { error } = await client
        .from("taxi_driver_reviews")
        .insert([{
            driver_username: driverUsername,
            driver_display_name: driverDisplayName,
            rating: rating,
            reviewer_name: name || "Anonym",
            review_text: text,
            visible: true
        }]);

    if (error) {
        console.error(error);
        alert("Bewertung konnte nicht gespeichert werden.");
        return;
    }

    alert("Bewertung gespeichert. Danke!");
    loadDriverProfile();
}
