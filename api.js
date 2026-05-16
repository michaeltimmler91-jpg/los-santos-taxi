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
