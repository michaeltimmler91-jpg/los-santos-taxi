function runTaxiEgg() {

    alert("🚕 Taxi Easter Egg!");

}

function runCrashEgg() {

    alert("💥 Leitstelle abgestürzt!");

}

function runDiscoEgg() {

    document.body.style.animation =
        "discoFlash 0.3s infinite";

    setTimeout(() => {

        document.body.style.animation = "";

    }, 5000);
}
