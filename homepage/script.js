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

async function loadTaxiStatus() {

  try {

    const { data, error } =
    await supabaseClient
      .from("taxi_driver_status")
      .select("*");

    if (error) {
      throw error;
    }

    const onlineDrivers =
    (data || []).filter(
      driver =>
        driver.status === "Im Dienst"
    );

    const count =
    onlineDrivers.length;

    if (count > 0) {

      liveIndicator.classList.remove(
        "offline"
      );

      liveIndicator.classList.add(
        "online"
      );

      liveBannerTitle.innerHTML =
      "Taxi verf&uuml;gbar";

      liveBannerDrivers.innerHTML =
      `${count} Fahrer im Dienst`;

    } else {

      liveIndicator.classList.remove(
        "online"
      );

      liveIndicator.classList.add(
        "offline"
      );

      liveBannerTitle.innerHTML =
      "Aktuell kein Taxi verf&uuml;gbar";

      liveBannerDrivers.innerHTML =
      "Momentan keine Fahrer im Dienst";
    }

  } catch (err) {

    console.error(err);

    liveBannerTitle.innerHTML =
    "Status aktuell nicht verf&uuml;gbar";

    liveBannerDrivers.innerHTML =
    "Bitte sp&auml;ter erneut versuchen";
  }
}

loadTaxiStatus();

setInterval(
  loadTaxiStatus,
  60000
);
