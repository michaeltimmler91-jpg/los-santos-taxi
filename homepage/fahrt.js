const orderForm =
document.getElementById(
  "orderForm"
);

const orderMessage =
document.getElementById(
  "orderMessage"
);

async function submitOrder(event) {

  event.preventDefault();

  const customerName =
  document.getElementById(
    "customerName"
  ).value.trim();

  const pickup =
  document.getElementById(
    "pickup"
  ).value.trim();

  const destination =
  document.getElementById(
    "destination"
  ).value.trim();

  const note =
  document.getElementById(
    "note"
  ).value.trim();

  if (
    !customerName ||
    !pickup ||
    !destination
  ) {

    orderMessage.innerHTML =
    "Bitte alle Pflichtfelder ausfüllen.";

    return;
  }

  orderMessage.innerHTML =
  "Fahrt wird angefragt...";

  try {

    const { error } =
    await supabaseClient
      .from("taxi_orders")
      .insert({
        customer_name:
          customerName,

        pickup:
          pickup,

        destination:
          destination,

        note:
          note,

        status:
          "Offen",

        created_at:
          new Date().toISOString()
      });

    if (error) {
      throw error;
    }

    orderForm.reset();

    orderMessage.innerHTML =
      "✅ Fahrt erfolgreich angefragt.";

  } catch (err) {

    console.error(err);

    orderMessage.innerHTML =
      "❌ Anfrage konnte nicht gesendet werden.";
  }
}

if(orderForm){

  orderForm.addEventListener(
    "submit",
    submitOrder
  );
}
const fahrtLiveStatus =
document.getElementById(
  "fahrtLiveStatus"
);

const fahrtLiveDot =
document.getElementById(
  "fahrtLiveDot"
);

const fahrtLiveTitle =
document.getElementById(
  "fahrtLiveTitle"
);

const fahrtLiveText =
document.getElementById(
  "fahrtLiveText"
);

async function loadDriverStatus() {

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

    if (onlineDrivers.length > 0) {

      fahrtLiveStatus.classList.remove(
        "offline"
      );

      fahrtLiveStatus.classList.add(
        "online"
      );

      fahrtLiveDot.classList.remove(
        "offline"
      );

      fahrtLiveDot.classList.add(
        "online"
      );

      fahrtLiveTitle.innerHTML =
      "Fahrer aktuell verf&uuml;gbar";

      fahrtLiveText.innerHTML =
      `${onlineDrivers.length} Fahrer befinden sich aktuell im Dienst.`;

    } else {

      fahrtLiveStatus.classList.remove(
        "online"
      );

      fahrtLiveStatus.classList.add(
        "offline"
      );

      fahrtLiveDot.classList.remove(
        "online"
      );

      fahrtLiveDot.classList.add(
        "offline"
      );

      fahrtLiveTitle.innerHTML =
      "Aktuell keine Fahrer im Dienst";

      fahrtLiveText.innerHTML =
      "Fahrtanfragen k&ouml;nnen verz&ouml;gert bearbeitet werden.";
    }

  } catch (err) {

    console.error(err);

  }
}

loadDriverStatus();
setInterval(
  loadDriverStatus,
  60000
);
