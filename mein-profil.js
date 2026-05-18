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

async function profileLogin() {
    const username =
        document.getElementById("profile_login_username").value.trim();

    const password =
        document.getElementById("profile_login_password").value.trim();

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
    document.getElementById("profile_login_box").style.display = "none";
    document.getElementById("profile_edit_box").style.display = "grid";

    if (!profileBioEditor) {
        profileBioEditor = new Quill("#profile_bio_editor", {
            theme: "snow",
            placeholder: "Schreib etwas über deinen Fahrer...",
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
    }

    document.getElementById("profile_preview_name").innerText =
        profileUser.display_name;

    document.getElementById("profile_public_link").href =
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

    document.getElementById("profile_image_url").value =
        profile.profile_image_url || "";

    profileBioEditor.root.innerHTML =
        profile.bio_html || profile.bio || "";

    updateProfilePreview();
}

function updateProfilePreview() {
    const imageUrl =
        document.getElementById("profile_image_url").value.trim();

    const img =
        document.getElementById("profile_preview_img");

    const placeholder =
        document.getElementById("profile_preview_placeholder");

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
    const imageUrl =
        document.getElementById("profile_image_url").value.trim();

    const bioHtml =
        profileBioEditor.root.innerHTML.trim();

    const bioText =
        profileBioEditor.getText().trim();

    const result =
        document.getElementById("profile_save_result");

    const { error } = await client
        .from("taxi_driver_profiles")
        .upsert({
            username: profileUser.username,
            display_name: profileUser.display_name,
            profile_image_url: imageUrl || null,
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
