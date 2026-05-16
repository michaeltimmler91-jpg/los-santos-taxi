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
