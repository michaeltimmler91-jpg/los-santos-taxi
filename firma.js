<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Taxi Firmenauftrag</title>

    <link rel="stylesheet" href="style.css?v=16">
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
<body>

<div class="container">

    <div class="modern-header">
        <div class="header-left">
            <div class="logo-icon">🍔</div>

            <div>
                <div class="main-title">Lieferauftrag</div>
                <div class="sub-title">Los Santos Taxi • Firmenservice</div>
            </div>
        </div>
    </div>
<div
    id="no_driver_box"
    class="admin-card no-driver-card"
    style="
        display:none;
        max-width:800px;
        margin:auto auto 20px auto;
    "
>

    <div class="no-driver-icon">
        🚕
    </div>

    <div class="no-driver-title">
        Aktuell kein Fahrer im Dienst
    </div>

    <div class="no-driver-text">
        Bestellungen sind momentan geschlossen.<br>
        Bitte später erneut versuchen.
    </div>

    <div class="no-driver-status">
        Die Seite aktualisiert sich automatisch.
    </div>

</div>
    <div
    class="card"
    id="company_form_card"
    style="max-width:800px;margin:auto;"
>

        <h2>🍔 Auftrag an Taxi senden</h2>

        <div class="admin-card" style="margin-bottom:20px;">
    <strong>Hinweis</strong><br>
    Nach dem Absenden wird der Auftrag direkt an die Taxi-Leitstelle übertragen.
    Der Status wird darunter live aktualisiert.
</div>

        <div id="fixed_company_box" class="admin-card" style="display:none;">
            Firma: <strong id="fixed_company_name">-</strong>
        </div>

        <div class="form-grid">

            <div class="field" id="company_select_field">
                <label>Unternehmen</label>
                <select id="company_name"></select>
            </div>

            <div class="field">
                <label>Geheimer Firmen-Code</label>
                <input type="password" id="company_code">
            </div>

            <div class="field">
                <label>Kunde / Empfänger</label>
                <input type="text" id="customer_name">
            </div>

            <div class="field">
                <label>Ziel / PLZ</label>
                <input type="text" id="destination">
            </div>

            <div class="field">
                <label>Essenskosten</label>
                <input type="number" id="food_cost" value="0">
            </div>

            <div class="field">
                <label>Bemerkung</label>
                <input type="text" id="notes">
            </div>

        </div>

        <button onclick="sendCompanyJob()">
            Auftrag senden
        </button>

        <div id="company_result" style="margin-top:20px;"></div>
        <div
    id="live_job_status"
    class="admin-card"
    style="display:none;margin-top:20px;"
></div>
<div
    class="card"
    style="margin-top:24px;"
>
    <div
    style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:12px;
        margin-bottom:18px;
    "
>
    <h2 style="margin:0;">📦 Letzte Aufträge</h2>

    <button
        class="small-btn secondary-btn"
        onclick="loadLastCompanyJobs()"
    >
        🔄 Aktualisieren
    </button>
</div>

    <div id="company_last_jobs">
        Lädt...
    </div>
</div>
    </div>

</div>
<script src="config.js?v=2"></script>
<script src="utils.js?v=2"></script>
<script src="api.js?v=1"></script>
<script src="firma.js?v=17"></script>

</body>
</html>
