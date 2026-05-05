const SUPABASE_URL = "https://unkfqoplynwabulnzpar.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_AkIVrLBsgIV2jYJ5gGsBmw_f7P62KTK";

const client = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

let currentUser = null;

async function loginUser() {

    const username = document.getElementById("login_username").value;
    const password = document.getElementById("login_password").value;

    const { data, error } = await client
        .from("taxi_users")
        .select("*")
        .eq("username", username)
        .eq("password", password)
        .single();

    if (error || !data) {
        alert("Login fehlgeschlagen");
        return;
    }

    currentUser = data;

    localStorage.setItem(
        "taxiUser",
        JSON.stringify(data)
    );

    startApp();
}

function logoutUser() {

    localStorage.removeItem("taxiUser");
    location.reload();
}

function startApp() {

    const savedUser = localStorage.getItem("taxiUser");

    if (!savedUser) {
        return;
    }

    currentUser = JSON.parse(savedUser);

    document.getElementById("loginBox").style.display = "none";
    document.getElementById("appBox").style.display = "block";

    document.getElementById("currentUserName").innerText =
        currentUser.display_name;

    document.getElementById("currentUserRole").innerText =
        currentUser.role;

    document.getElementById("driver_name").value =
        currentUser.display_name;

    loadRides();

if (currentUser.role === "admin") {
    document.getElementById("adminPanel").style.display = "block";
    loadUsers();
}
}

async function saveRide() {

    const driver_name = currentUser.display_name;

    const customer_name =
        document.getElementById("customer_name").value;

    const ride_type =
        document.getElementById("ride_type").value;

    const start_location =
        document.getElementById("start_location").value;

    const end_location =
        document.getElementById("end_location").value;

    const kilometers =
        Number(document.getElementById("kilometers").value);

    const tip_amount =
        Number(document.getElementById("tip_amount").value);

    const food_advance =
        Number(document.getElementById("food_advance").value);

    const advance_source =
        document.getElementById("advance_source").value;

    const notes =
        document.getElementById("notes").value;

    let fare_amount = 0;
    let billed_to = "Kunde";

    if (
        ride_type === "Normale Fahrt" ||
        ride_type === "Essenslieferung"
    ) {
        fare_amount = kilometers * 5;
    }

    if (ride_type === "EMS") {
        fare_amount = kilometers * 5;
        billed_to = "EMS";
    }

    if (ride_type === "Gebrauchtwagenhändler") {
        fare_amount = kilometers * 5;
        billed_to = "Gebrauchtwagenhändler";
    }

    if (ride_type === "Bambi-Tour") {
        fare_amount = 0;
        billed_to = "Kostenlos";
    }

    const { error } = await client
        .from("taxi_rides")
        .insert([
            {
                driver_name,
                customer_name,
                ride_type,
                start_location,
                end_location,
                kilometers,
                fare_amount,
                tip_amount,
                food_advance,
                advance_source,
                billed_to,
                notes
            }
        ]);

    if (error) {
        alert("Fehler beim Speichern");
        console.error(error);
        return;
    }

    alert("Fahrt gespeichert");

    document.getElementById("customer_name").value = "";
    document.getElementById("start_location").value = "";
    document.getElementById("end_location").value = "";
    document.getElementById("kilometers").value = "";
    document.getElementById("tip_amount").value = "";
    document.getElementById("food_advance").value = "";
    document.getElementById("notes").value = "";

    loadRides();
}

async function loadRides() {

    const ridesList =
        document.getElementById("rides_list");

    let query = client
        .from("taxi_rides")
        .select("*")
        .order("created_at", {
            ascending: false
        })
        .limit(20);

    if (currentUser.role !== "admin") {

        query = query.eq(
            "driver_name",
            currentUser.display_name
        );
    }

    const { data, error } = await query;

    if (error) {
        console.error(error);
        return;
    }

    ridesList.innerHTML = "";

    data.forEach(ride => {

        ridesList.innerHTML += `
            <div class="ride-card">

                <strong>${ride.driver_name}</strong>
                (${ride.ride_type})

                <br><br>

                👤 ${ride.customer_name || "-"}

                <br>

                📍 ${ride.start_location}
                → ${ride.end_location}

                <br>

                🚕 ${ride.kilometers} KM

                <br>

                💰 ${ride.fare_amount}$

                <br>

                🎁 ${ride.tip_amount}$ Trinkgeld

                <br>

                📝 ${ride.notes || "-"}

            </div>
        `;
    });
}

startApp();

async function createUser() {

    if (!currentUser || currentUser.role !== "admin") {
        alert("Keine Berechtigung");
        return;
    }

    const username = document.getElementById("new_username").value;
    const display_name = document.getElementById("new_display_name").value;
    const password = document.getElementById("new_password").value;
    const role = document.getElementById("new_role").value;

    const { error } = await client
        .from("taxi_users")
        .insert([
            {
                username,
                display_name,
                password,
                role,
                active: true
            }
        ]);

    if (error) {
        alert("Benutzer konnte nicht erstellt werden");
        console.error(error);
        return;
    }

    alert("Benutzer erstellt");

    document.getElementById("new_username").value = "";
    document.getElementById("new_display_name").value = "";
    document.getElementById("new_password").value = "";

    loadUsers();
}

async function loadUsers() {

    if (!currentUser || currentUser.role !== "admin") {
        return;
    }

    const usersList = document.getElementById("users_list");

    const { data, error } = await client
        .from("taxi_users")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    usersList.innerHTML = "";

    data.forEach(user => {

        usersList.innerHTML += `
            <div class="ride-card">
                <strong>${user.display_name}</strong>
                <br>
                Benutzer: ${user.username}
                <br>
                Rolle: ${user.role}
                <br>
                Aktiv: ${user.active ? "Ja" : "Nein"}
            </div>
        `;
    });
}
