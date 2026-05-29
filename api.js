async function getTaxiUsers() {

    const { data, error } = await client
        .from("taxi_users")
        .select("*");

    if (error) {
        console.error(error);
        return [];
    }

    return data || [];
}

async function getTaxiCompanies() {

    const { data, error } = await client
        .from("taxi_companies")
        .select("*")
        .order("company_name", {
            ascending: true
        });

    if (error) {
        console.error(error);
        return [];
    }

    return data || [];
}

async function getTaxiJobs() {

    const { data, error } = await client
        .from("taxi_jobs")
        .select("*");

    if (error) {
        console.error(error);
        return [];
    }

    return data || [];
}
async function getOpenJobs() {

    const { data, error } = await client
        .from("taxi_jobs")
        .select("*")
        .eq("job_status", "Offen")
        .order("created_at", {
            ascending: false
        });

    if (error) {
        console.error(error);
        return [];
    }

    return data || [];
}

async function getDoneJobs(limit = 20) {

    const { data, error } = await client
        .from("taxi_jobs")
        .select("*")
        .in("job_status", [
            "Erledigt",
            "Nicht angetroffen"
        ])
        .order("completed_at", {
            ascending: false
        })
        .limit(limit);

    if (error) {
        console.error(error);
        return [];
    }

    return data || [];
}
async function getAnnouncements() {

    const { data, error } = await client
        .from("taxi_announcements")
        .select("*")
        .order("created_at", {
            ascending: false
        });

    if (error) {
        console.error(error);
        return [];
    }

    return data || [];
}

async function getActiveAnnouncements() {

    const { data, error } = await client
        .from("taxi_announcements")
        .select("*")
        .eq("active", true)
        .order("created_at", {
            ascending: false
        });

    if (error) {
        console.error(error);
        return [];
    }

    return data || [];
}
async function getActiveRequiredAnnouncements() {

    const { data, error } = await client
        .from("taxi_announcements")
        .select("*")
        .eq("active", true)
        .eq("must_confirm", true)
        .order("created_at", {
            ascending: false
        });

    if (error) {
        console.error(error);
        return [];
    }

    return data || [];
}

async function getAnnouncementRead(announcementId, username) {

    const { data, error } = await client
        .from("taxi_announcement_reads")
        .select("*")
        .eq("announcement_id", announcementId)
        .eq("username", username)
        .maybeSingle();

    if (error) {
        console.error(error);
        return null;
    }

    return data;
}
async function saveAnnouncementRead(announcementId, user) {

    const { error } = await client
        .from("taxi_announcement_reads")
        .insert([{
            announcement_id: announcementId,
            username: user.username,
            display_name: user.display_name
        }]);

    if (error) {
        console.error(error);
        return false;
    }

    return true;
}


/* =========================
   GLOBALE TAXI EINSTELLUNGEN
========================= */

async function getTaxiSetting(key, fallbackValue = null) {

    const { data, error } = await client
        .from("taxi_settings")
        .select("*")
        .eq("key", key)
        .maybeSingle();

    if (error) {
        console.error(error);
        return fallbackValue;
    }

    if (!data) {
        return fallbackValue;
    }

    return data.value;
}

async function setTaxiSetting(key, value) {

    const { error } = await client
        .from("taxi_settings")
        .upsert({
            key: key,
            value: String(value),
            updated_at: new Date().toISOString()
        });

    if (error) {
        console.error(error);
        return false;
    }

    return true;
}

async function getDeliveriesEnabled() {

    const value =
    await getTaxiSetting(
        "deliveries_enabled",
        "true"
    );

    return value === "true";
}

async function setDeliveriesEnabled(enabled) {

    return await setTaxiSetting(
        "deliveries_enabled",
        enabled ? "true" : "false"
    );
}
async function getBambiToursEnabled() {

    const { data } =
    await client
        .from("taxi_settings")
        .select("value")
        .eq("key", "bambi_tours_enabled")
        .single();

    return data?.value === "true";
}

async function setBambiToursEnabled(value) {

    const { error } =
    await client
        .from("taxi_settings")
        .upsert({
            key: "bambi_tours_enabled",
            value: value ? "true" : "false"
        });

    return !error;
}
