const orderForm =
document.getElementById("orderForm");

const orderMessage =
document.getElementById("orderMessage");

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

  if (!customerName || !pickup || !destination) {
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
        created_at: new Date().toISOString(),
        created_by: "Homepage",
        job_status: "Offen",
        ride_type: "Normale Fahrt",
        pickup_location: pickup,
        destination: destination,
        customer_name: customerName,
        notes: note,
        billed_to: "Kunde",
        kilometers: 0,
        fare_amount: 0,
        invoice_amount: 0,
        tip_amount: 0,
        food_cost: 0,
        refund_amount: 0,
        tip_paid: false,
        dealer_paid: false
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

if (orderForm) {
  orderForm.addEventListener(
    "submit",
    submitOrder
  );
}
