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
        .select("*");

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
