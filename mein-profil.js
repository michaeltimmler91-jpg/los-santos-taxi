let currentProfile = null;
let profileUser = null;
let profileBioEditor = null;

document.addEventListener("DOMContentLoaded", () => {
    startMyProfile();
});

async function startMyProfile() {
    const saved = localStorage.getItem("taxiMobileUser");

    if (saved) {
        profileUser = JSON.parse(saved);
        await loadMyProfile();
    }
}

function getEl(id) {
    return document.getElementById(id);
}

function setValue(id, value) {
    const el = getEl(id);

    if (!el) {
        console.warn("Feld nicht gefunden:", id);
        return;
    }

    el.value = value || "";
}


async function profileLogin() {
    const username = getEl("profile_login_username").value.trim();
    const password = getEl("profile_login_password").value.trim();

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

    profileUser = data;

    localStorage.setItem(
        "taxiMobileUser",
        JSON.stringify(data)
    );

    await loadMyProfile();
}

async function loadMyProfile() {
    getEl("profile_login_box").style.display = "none";
    getEl("profile_edit_box").style.display = "grid";

    if (!profileBioEditor) {
        profileBioEditor = new Quill("#profile_bio_editor", {
            theme: "snow",
            placeholder: "Was sollten Fahrgäste über dich wissen?",
            modules: {
                toolbar: [
                    ["bold", "italic", "underline"],
                    [{ "header": [2, 3, false] }],
                    [{ "color": [] }],
                    [{ "list": "ordered" }, { "list": "bullet" }],
                    ["link"],
                    ["clean"]
                ]
            }
        });

        profileBioEditor.on("text-change", () => {
            updateProfileBioPreview();
        });
    }

    getEl("profile_preview_name").innerText = profileUser.display_name;

    getEl("profile_public_link").href =
        `profil.html?fahrer=${encodeURIComponent(profileUser.username)}`;

    let { data: profile, error } = await client
        .from("taxi_driver_profiles")
        .select("*")
        .eq("username", profileUser.username)
        .maybeSingle();

    if (error) {
        console.error(error);
    }

    if (!profile) {
        const { data: inserted, error: insertError } = await client
            .from("taxi_driver_profiles")
            .insert([{
                username: profileUser.username,
                display_name: profileUser.display_name,
                taxi_since: new Date().toISOString().split("T")[0],
                public_visible: true
            }])
            .select()
            .single();

        if (insertError) {
            console.error(insertError);
            alert("Profil konnte nicht angelegt werden.");
            return;
        }

        profile = inserted;
    }

    currentProfile = profile;

    setValue("profile_image_url", profile.profile_image_url);

    profileBioEditor.root.innerHTML =
        profile.bio_html || profile.bio || "";

    updateProfilePreview();
    updateProfileBioPreview();
    await loadMyVacations();
}

function updateProfilePreview() {
    const imageField = getEl("profile_image_url");
    const img = getEl("profile_preview_img");
    const placeholder = getEl("profile_preview_placeholder");

    if (!img || !placeholder) {
        return;
    }

    const imageUrl =
        imageField ? imageField.value.trim() : currentProfile?.profile_image_url || "";

    if (imageUrl) {
        img.src = imageUrl;
        img.style.display = "block";
        placeholder.style.display = "none";
    } else {
        img.style.display = "none";
        placeholder.style.display = "flex";
    }
}

async function saveMyProfile() {
    if (!currentProfile) {
        alert("Profil wurde noch nicht geladen.");
        return;
    }

    let profileImageUrl =
        currentProfile.profile_image_url || "";

    const imageField = getEl("profile_image_url");

    if (imageField && imageField.value.trim()) {
        profileImageUrl = imageField.value.trim();
    }

    const uploadedImage =
        await uploadProfileImage();

    if (uploadedImage) {
        profileImageUrl = uploadedImage;
    }

    const bioHtml =
        profileBioEditor.root.innerHTML.trim();

    const bioText =
        profileBioEditor.getText().trim();

    const result =
        getEl("profile_save_result");

    const { error } = await client
        .from("taxi_driver_profiles")
        .upsert({
            username: profileUser.username,
            display_name: profileUser.display_name,
            profile_image_url: profileImageUrl || null,
            bio: bioText || null,
            bio_html: bioHtml || null,
            public_visible: true,
            updated_at: new Date().toISOString()
        }, {
            onConflict: "username"
        });

    if (error) {
        console.error(error);

        result.innerHTML = `
            <div class="admin-card">
                ❌ Profil konnte nicht gespeichert werden.
            </div>
        `;

        return;
    }

    currentProfile.profile_image_url = profileImageUrl;

    updateProfilePreview();

    result.innerHTML = `
        <div class="admin-card success-card">
            <strong>✅ Profil gespeichert</strong><br>
            Deine Änderungen sind jetzt öffentlich sichtbar.
        </div>
    `;
}

document.addEventListener("input", event => {
    if (event.target && event.target.id === "profile_image_url") {
        updateProfilePreview();
    }
});

function updateProfileBioPreview() {
    const preview =
        getEl("profile_preview_bio");

    if (!preview || !profileBioEditor) {
        return;
    }

    const bioHtml =
        profileBioEditor.root.innerHTML.trim();

    if (!bioHtml || bioHtml === "<p><br></p>") {
        preview.innerHTML =
            "Noch keine Beschreibung vorhanden.";

        return;
    }

    preview.innerHTML =
        DOMPurify.sanitize(bioHtml);
}

async function uploadProfileImage() {
    const input =
        getEl("profile_image_upload");

    if (!input || !input.files[0]) {
        return null;
    }

    const file = input.files[0];

    const extension =
        file.name.split(".").pop();

    const fileName =
        `${profileUser.username}_${Date.now()}.${extension}`;

    const { error } = await client.storage
        .from("driver-profile-images")
        .upload(fileName, file, {
            upsert: true
        });

    if (error) {
        console.error(error);
        alert("Profilbild konnte nicht hochgeladen werden.");
        return null;
    }

    const { data } = client.storage
        .from("driver-profile-images")
        .getPublicUrl(fileName);

    return data.publicUrl;
}

async function saveVacation() {

    const start =
        document.getElementById("vacation_start").value;

    const end =
        document.getElementById("vacation_end").value;

    const reason =
        document.getElementById("vacation_reason").value.trim();

    if (!start || !end) {
        alert("Bitte Zeitraum auswählen.");
        return;
    }

    const { error } = await client
        .from("taxi_vacations")
        .insert([{
            username: profileUser.username,
            display_name: profileUser.display_name,
            start_date: start,
            end_date: end,
            reason: reason
        }]);

    if (error) {
        console.error(error);
        alert("Urlaub konnte nicht gespeichert werden.");
        return;
    }

    alert("Urlaub eingetragen.");
    loadMyVacations();
}

async function loadMyVacations() {
    const box = document.getElementById("myVacationList");
    if (!box || !profileUser) return;

    const { data, error } = await client
        .from("taxi_vacations")
        .select("*")
        .eq("username", profileUser.username)
        .order("start_date", { ascending: true });

    if (error) {
        console.error(error);
        box.innerHTML = "Urlaub konnte nicht geladen werden.";
        return;
    }

    if (!data || data.length === 0) {
        box.innerHTML = `
            <div class="admin-card" style="margin-top:16px;">
                Kein Urlaub eingetragen.
            </div>
        `;
        return;
    }

    box.innerHTML = data.map(vacation => `
        <div class="admin-card" style="margin-top:16px;">
            <strong>🌴 Urlaub</strong><br>
            Von: ${formatDateDE(vacation.start_date)}<br>
            Bis: ${formatDateDE(vacation.end_date)}<br>
            Grund: ${escapeHtml(vacation.reason || "Kein Grund")}

            <br><br>

            <button
                class="small-btn danger-btn"
                onclick="deleteMyVacation('${vacation.id}')"
            >
                Löschen
            </button>
        </div>
    `).join("");
}

async function deleteMyVacation(id) {
    const ok = confirm("Urlaub wirklich löschen?");
    if (!ok) return;

    const { error } = await client
        .from("taxi_vacations")
        .delete()
        .eq("id", id)
        .eq("username", profileUser.username);

    if (error) {
        console.error(error);
        alert("Urlaub konnte nicht gelöscht werden.");
        return;
    }

    await loadMyVacations();
}

function formatDateDE(value) {
    if (!value) return "-";

    return new Date(value).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}
