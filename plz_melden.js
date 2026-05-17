const supabaseClient =
supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

async function sendPlzReport(){

    const plz =
    document
    .getElementById("report_plz")
    .value
    .trim();

    const type =
    document
    .getElementById("report_type")
    .value;

    const text =
    document
    .getElementById("report_text")
    .value
    .trim();

    const name =
    document
    .getElementById("report_name")
    .value
    .trim();

    if(!plz){

        document
        .getElementById("report_result")
        .innerHTML = `
            <div class="error-box">
                Bitte eine PLZ eingeben.
            </div>
        `;

        return;
    }

    const { error } =
    await supabaseClient
    .from("plz_reports")
    .insert([{

        plz: plz,
        type: type,
        text: text,
        reporter: name

    }]);

    if(error){

        console.error(error);

        document
        .getElementById("report_result")
        .innerHTML = `
            <div class="error-box">
                Fehler beim Senden.
            </div>
        `;

        return;
    }

    document
    .getElementById("report_result")
    .innerHTML = `
        <div class="success-box">
            ✅ Danke! Die Meldung wurde gespeichert.
        </div>
    `;

    document
    .getElementById("report_plz")
    .value = "";

    document
    .getElementById("report_text")
    .value = "";

    document
    .getElementById("report_name")
    .value = "";
}
