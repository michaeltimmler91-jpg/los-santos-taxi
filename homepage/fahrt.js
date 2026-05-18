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
